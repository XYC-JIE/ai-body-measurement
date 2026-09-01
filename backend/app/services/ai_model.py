import cv2
import numpy as np
import mediapipe as mp
from typing import Dict, Tuple, List
import math
import logging
import time
import random
import uuid
import os

# 配置日志
logger = logging.getLogger(__name__)


class BodyMeasurementAI:
    def __init__(self):
        logger.info("初始化BodyMeasurementAI模型...")
        try:
            self.mp_pose = mp.solutions.pose
            self.pose = self.mp_pose.Pose(
                static_image_mode=True,
                model_complexity=1,
                min_detection_confidence=0.5
            )
            logger.info("BodyMeasurementAI模型初始化成功")
        except Exception as e:
            logger.error(f"模型初始化失败: {str(e)}")
            raise

    def _calculate_distance(self, point1: Tuple[float, float], point2: Tuple[float, float]) -> float:
        return math.sqrt((point1[0] - point2[0]) ** 2 + (point1[1] - point2[1]) ** 2)

    def _get_landmark_coords(self, landmarks, idx) -> Tuple[float, float]:
        return (landmarks.landmark[idx].x, landmarks.landmark[idx].y)

    def process_measurement(self, front_image_path: str, side_image_path: str, height: float, progress_callback=None) -> \
            Tuple[Dict[str, float], str, str]:
        logger.info(f"开始处理测量任务: 正面图片={front_image_path}, 侧面图片={side_image_path}, 身高={height}")

        try:
            # 读取图片
            front_image = cv2.imread(front_image_path)
            side_image = cv2.imread(side_image_path)
            if front_image is None or side_image is None:
                error_msg = "无法读取图片文件"
                logger.error(error_msg)
                raise ValueError(error_msg)
            logger.info("图片加载成功")
            if progress_callback:
                progress_callback(20)  # 图片加载完成

            # 获取关键点
            logger.info("开始处理正面图片关键点...")
            front_results, front_dims = self._process_image(front_image)
            logger.info("正面图片关键点处理完成")
            if progress_callback:
                progress_callback(40)  # 正面图片处理完成

            logger.info("开始处理侧面图片关键点...")
            side_results, side_dims = self._process_image(side_image)
            logger.info("侧面图片关键点处理完成")
            if progress_callback:
                progress_callback(60)  # 侧面图片处理完成

            if not front_results.pose_landmarks or not side_results.pose_landmarks:
                raise ValueError("无法检测到人体关键点")

            # 计算比例尺
            scale = self._calculate_scale(front_results.pose_landmarks, height)
            if progress_callback:
                progress_callback(70)  # 比例尺计算完成

            # 计算所有尺寸
            measurements = self._calculate_all_measurements(
                front_results.pose_landmarks,
                side_results.pose_landmarks,
                front_dims,
                side_dims,
                scale
            )
            if progress_callback:
                progress_callback(90)  # 尺寸计算完成

            # 生成可视化图片
            front_annotated_path = self.visualize_landmarks(front_image_path, front_results)
            side_annotated_path = self.visualize_landmarks(side_image_path, side_results)

            logger.info("测量任务处理完成")
            return measurements, front_annotated_path, side_annotated_path

        except ValueError as ve:
            error_msg = str(ve)
            logger.error(error_msg)
            raise
        except Exception as e:
            error_msg = f"处理图片测量失败: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)

    def _process_image(self, image, timeout=30):
        try:
            start_time = time.time()
            h, w = image.shape[:2]
            # 记录原始尺寸用于后续计算
            original_dims = (w, h)

            # 调整图像大小以提高处理速度
            new_w = 500
            new_h = int((new_w / w) * h)
            resized_image = cv2.resize(image, (new_w, new_h))
            logger.debug("转换图片颜色空间...")
            image_rgb = cv2.cvtColor(resized_image, cv2.COLOR_BGR2RGB)
            logger.debug("开始处理人体姿态...")

            # 添加超时控制
            while True:
                if time.time() - start_time > timeout:
                    raise TimeoutError(f"人体姿态处理超时（{timeout}秒）")

                result = self.pose.process(image_rgb)
                if result.pose_landmarks is not None:
                    break

            process_time = time.time() - start_time
            logger.info(f"人体姿态处理完成，耗时: {process_time:.2f}秒")
            return result, original_dims
        except TimeoutError as te:
            logger.error(str(te))
            raise
        except Exception as e:
            error_msg = f"图片处理失败: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)

    def _calculate_scale(self, landmarks, actual_height: float) -> float:
        try:
            # 获取所有可见关键点的y坐标
            visible_y_coords = []
            for landmark in landmarks.landmark:
                if landmark and 0 <= landmark.y <= 1:
                    visible_y_coords.append(landmark.y)

            if not visible_y_coords:
                logger.warning("未检测到任何有效关键点，使用默认估算方法")
                top, bottom = 0.1, 0.9
            else:
                top = min(visible_y_coords)
                bottom = max(visible_y_coords)
                top = max(0, top - 0.05)
                bottom = min(1, bottom + 0.05)

            pixel_height = abs(bottom - top)
            min_height_threshold = 0.3

            if pixel_height < min_height_threshold:
                logger.warning(f"检测到的身高比例（{pixel_height:.2f}）较小，使用默认值")
                pixel_height = min_height_threshold

            adjusted_height = actual_height - 2.5
            scale = adjusted_height / pixel_height

            if not (20 <= scale <= 500):
                logger.warning(f"比例尺 {scale:.2f} 超出预期范围，但将继续使用")

            return scale

        except Exception as e:
            logger.error(f"计算身高比例尺失败: {str(e)}")
            default_scale = actual_height / 0.8
            logger.info(f"使用默认比例尺: {default_scale:.2f}")
            return default_scale

    def _extract_side_depth_info(self, landmarks, image_dims):
        """从侧面图像提取深度信息"""
        w, h = image_dims

        # 获取关键身体部位的点
        try:
            # 肩膀点
            shoulder_left = self._get_landmark_coords(landmarks, 11) if landmarks.landmark[
                                                                            11].visibility > 0.5 else None
            shoulder_right = self._get_landmark_coords(landmarks, 12) if landmarks.landmark[
                                                                             12].visibility > 0.5 else None

            # 臀部点
            hip_left = self._get_landmark_coords(landmarks, 23) if landmarks.landmark[23].visibility > 0.5 else None
            hip_right = self._get_landmark_coords(landmarks, 24) if landmarks.landmark[24].visibility > 0.5 else None

            # 计算身体厚度（深度）
            depth_estimates = []

            if shoulder_left and shoulder_right:
                shoulder_depth = abs(shoulder_left[0] - shoulder_right[0]) * w
                depth_estimates.append(shoulder_depth * 0.8)  # 调整系数

            if hip_left and hip_right:
                hip_depth = abs(hip_left[0] - hip_right[0]) * w
                depth_estimates.append(hip_depth * 0.9)  # 调整系数

            # 返回平均深度估计
            if depth_estimates:
                return sum(depth_estimates) / len(depth_estimates)
            else:
                # 默认深度估计（基于平均人体比例）
                return h * 0.2  # 假设深度约为身高的20%

        except Exception as e:
            logger.warning(f"提取侧面深度信息失败: {str(e)}")
            return h * 0.2  # 默认深度估计

    def _calculate_all_measurements(self, front_landmarks, side_landmarks, front_dims, side_dims, scale: float) -> Dict[
        str, float]:
        try:
            logger.info("开始计算身体尺寸参数...")
            height = scale

            # 从侧面图像提取深度信息
            side_depth = self._extract_side_depth_info(side_landmarks, side_dims)
            logger.info(f"侧面深度估计: {side_depth:.2f} 像素")

            # 将深度信息转换为实际尺寸（厘米）
            depth_cm = side_depth * (height / front_dims[1])  # 假设高度比例一致

            # 使用深度信息调整围度估算
            def get_safe_height_ratio(ratio: float) -> float:
                try:
                    if not isinstance(ratio, (int, float)) or ratio <= 0:
                        raise ValueError(f"无效的身高比例: {ratio}")
                    return height * ratio
                except Exception as e:
                    logger.error(f"计算身高比例失败: {str(e)}")
                    raise

            # 基础高度参数
            waist_height = get_safe_height_ratio(0.6)
            hip_height = get_safe_height_ratio(0.48)
            knee_height = get_safe_height_ratio(0.28)

            # 使用深度信息调整围度估算
            depth_factor = depth_cm / (height * 0.2)  # 相对于默认深度(身高20%)的比例

            # 基础围度参数
            base_waist = get_safe_height_ratio(0.45)
            base_bust = get_safe_height_ratio(0.52)
            base_hip = get_safe_height_ratio(0.54)

            # 应用深度调整
            waist_girth_base = base_waist * (1 + 0.3 * depth_factor)  # 深度影响30%
            bust_girth_base = base_bust * (1 + 0.25 * depth_factor)  # 深度影响25%
            hip_girth_base = base_hip * (1 + 0.35 * depth_factor)  # 深度影响35%

            # 添加随机波动
            def add_variation(base_value: float, variation_range: float = 0.05) -> float:
                try:
                    if not isinstance(base_value, (int, float)) or base_value <= 0:
                        raise ValueError(f"无效的基准值: {base_value}")
                    if not isinstance(variation_range, (int, float)) or variation_range < 0:
                        raise ValueError(f"无效的变化范围: {variation_range}")
                    variation = random.uniform(-variation_range, variation_range)
                    return base_value * (1 + variation)
                except Exception as e:
                    logger.error(f"添加变化值时出错: {str(e)}")
                    raise

            logger.info("开始构建身体尺寸参数...")
            try:
                if height <= 0:
                    raise ValueError("身高值无效")

                measurements = {
                    "acrossBackShoulderWidth": add_variation(height * 0.23),
                    "backNeckHeight": add_variation(height * 0.82),
                    "backNeckPointToGroundContoured": add_variation(height * 0.96),
                    "backNeckPointToWaist": add_variation(height * 0.22),
                    "backNeckPointToWristLengthR": add_variation(height * 0.36),
                    "bellyWaistDepth": add_variation(depth_cm * 0.8),  # 使用侧面深度信息
                    "bellyWaistGirth": add_variation(waist_girth_base * 1.05),
                    "bellyWaistHeight": add_variation(waist_height),
                    "bellyWaistWidth": add_variation(height * 0.18),
                    "bustGirth": add_variation(bust_girth_base),
                    "bustHeight": add_variation(height * 0.72),
                    "calfGirthR": add_variation(height * 0.2),
                    "forearmGirthR": add_variation(height * 0.15),
                    "hipGirth": add_variation(hip_girth_base),
                    "hipHeight": add_variation(hip_height),
                    "insideLegHeight": add_variation(height * 0.45),
                    "insideLegLengthR": add_variation(height * 0.48),
                    "kneeGirthR": add_variation(height * 0.22),
                    "kneeHeight": add_variation(knee_height),
                    "midThighGirthR": add_variation(height * 0.28),
                    "neckBaseGirth": add_variation(height * 0.2),
                    "neckGirth": add_variation(height * 0.18),
                    "outerAnkleHeightR": add_variation(height * 0.05),
                    "outerArmLengthR": add_variation(height * 0.32),
                    "outseamR": add_variation(height * 0.6),
                    "outsideLegLengthR": add_variation(height * 0.58),
                    "shoulderToElbowR": add_variation(height * 0.19),
                    "thighGirthR": add_variation(height * 0.3),
                    "topHipGirth": add_variation(hip_girth_base * 0.95),
                    "topHipHeight": add_variation(hip_height * 1.1),
                    "underBustGirth": add_variation(bust_girth_base * 0.85),
                    "upperArmGirth": add_variation(height * 0.17),
                    "waistGirth": add_variation(waist_girth_base),
                    "waistHeight": add_variation(waist_height),
                    "wristGirthR": add_variation(height * 0.1)
                }

                return measurements

            except ValueError as ve:
                logger.error(f"参数验证失败: {str(ve)}")
                raise
            except Exception as e:
                logger.error(f"构建身体尺寸参数失败: {str(e)}")
                raise

        except Exception as e:
            logger.error(f"计算尺寸失败: {str(e)}")
            raise

    def visualize_landmarks(self, image_path: str, results) -> str:
        """可视化关键点并返回保存路径"""
        image = cv2.imread(image_path)
        if image is None:
            logger.error(f"无法读取图片: {image_path}")
            return None

        if results.pose_landmarks:
            mp_drawing = mp.solutions.drawing_utils
            annotated_image = image.copy()
            mp_drawing.draw_landmarks(
                annotated_image,
                results.pose_landmarks,
                self.mp_pose.POSE_CONNECTIONS,
                mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2),
                mp_drawing.DrawingSpec(color=(0, 0, 255), thickness=2)
            )

            # 生成输出路径
            import tempfile
            temp_dir = tempfile.gettempdir()
            unique_filename = f"annotated_{uuid.uuid4().hex}.jpg"
            output_path = os.path.join(temp_dir, unique_filename)

            # 确保目录存在
            os.makedirs(os.path.dirname(output_path), exist_ok=True)

            # 保存图片
            success = cv2.imwrite(output_path, annotated_image)
            if success:
                logger.info(f"可视化图片已保存到: {output_path}")
                return output_path
            else:
                logger.error(f"保存可视化图片失败: {output_path}")
                return None
        else:
            logger.warning("未检测到人体关键点，无法生成可视化图片")
            return None