import time
from typing import List, Dict, Tuple, Optional, Callable
from .ai_model import BodyMeasurementAI


class MeasurementCalculator:
    def __init__(self, front_image_path: str, side_image_path: str, height: float, timeout: int = 30,
                 progress_callback: Optional[Callable[[int], None]] = None):
        self.front_image_path = front_image_path
        self.side_image_path = side_image_path
        self.height = height
        self.timeout = timeout
        self.progress_callback = progress_callback
        self.ai_model = BodyMeasurementAI()

    def calculate_measurements(self) -> Tuple[List[Dict[str, float]], str, str]:
        """计算33个人体尺寸

         Returns:
            Tuple: 包含尺寸列表、正面可视化图片路径、侧面可视化图片路径

        Raises:
            Exception: 计算过程中的错误
        """
        try:
            start_time = time.time()

            # 更新进度：开始处理
            if self.progress_callback:
                self.progress_callback(10)

            # 使用AI模型计算尺寸和可视化图片
            measurements_dict, front_annotated_path, side_annotated_path = self.ai_model.process_measurement(
                self.front_image_path,
                self.side_image_path,
                self.height,
                self.progress_callback
            )

            # 将字典转换为列表格式
            measurements = [
                {"parameter_name": key, "value": value}
                for key, value in measurements_dict.items()
            ]

            # 更新进度：全部完成
            if self.progress_callback:
                self.progress_callback(100)

            # 记录总耗时
            total_time = time.time() - start_time
            print(f"尺寸计算完成，总耗时: {total_time:.2f}秒")

            return measurements, front_annotated_path, side_annotated_path
        except Exception as e:
            if self.progress_callback:
                self.progress_callback(-1)  # 表示计算失败
            raise Exception(f"计算尺寸时发生错误: {str(e)}")
