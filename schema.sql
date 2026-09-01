-- =============================================================
-- AI 身体测量 · 数据库结构（仅建表结构，不含任何真实数据）
-- 后端由 SQLAlchemy 的 Base.metadata.create_all 自动建表，
-- 此文件仅作为结构参考，方便快速了解数据模型。
-- =============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 用户表
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `gender` varchar(10) DEFAULT NULL,          -- 'male' / 'female'
  `age` int(11) DEFAULT NULL,
  `weight` float DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 测量记录表（一次测量 = 正面 + 侧面两张图）
CREATE TABLE `measurements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `height` float NOT NULL,                    -- 身高(cm)
  `front_image_url` text NOT NULL,            -- 正面照
  `side_image_url` text NOT NULL,             -- 侧面照
  `front_annotated_image_url` text DEFAULT NULL, -- 正面关键点标注图
  `side_annotated_image_url` text DEFAULT NULL,  -- 侧面关键点标注图
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 测量明细表（一次测量产生的 33 项身体尺寸）
CREATE TABLE `measurement_details` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `measurement_id` int(11) NOT NULL,
  `parameter_name` varchar(50) NOT NULL,      -- 尺寸参数名，如 waistGirth
  `value` float NOT NULL,                     -- 尺寸值(cm)
  PRIMARY KEY (`id`),
  KEY `measurement_id` (`measurement_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- BMI 记录表
CREATE TABLE `bmi_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `height` decimal(5,2) NOT NULL COMMENT '身高(cm)',
  `weight` decimal(5,2) NOT NULL COMMENT '体重(kg)',
  `bmi_value` decimal(4,1) NOT NULL COMMENT 'BMI值',
  `category` varchar(20) NOT NULL COMMENT 'BMI分类',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 文章 / 分享表
CREATE TABLE `articles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `images` json DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
