-- 创建数据库
CREATE DATABASE IF NOT EXISTS `habot_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `habot_db`;

-- 1. 资源分类表 (对应 config.json 中的 folder 数组项)
-- 存储如 { "name": "cat", "path": "cat", "type": "image" } 这样的配置
CREATE TABLE IF NOT EXISTS `resource_categories` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键 ID',
    `name` VARCHAR(50) NOT NULL UNIQUE COMMENT '资源分类名称 (如 cat, stress)，需唯一',
    `path` VARCHAR(255) NOT NULL COMMENT '资源存储路径或标识 (如 cat, bluelock)',
    `type` VARCHAR(20) NOT NULL COMMENT '资源类型 (如 image, voice)',
    `description` VARCHAR(255) DEFAULT NULL COMMENT '分类描述',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB COMMENT='资源分类配置表';

-- 2. 资源项表 (对应 config.json 中的 children 字符串数组)
-- 将 children 数组中的每个字符串存储为一行记录
CREATE TABLE IF NOT EXISTS `resource_items` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键 ID',
    `category_id` INT UNSIGNED NOT NULL COMMENT '关联的分类 ID',
    `content` TEXT NOT NULL COMMENT '资源内容 (URL 或 文件路径)',
    `is_active` BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (`category_id`) REFERENCES `resource_categories`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='具体资源项表';

-- 示例：插入初始化数据 (基于当前的 config.json)
-- 插入分类
INSERT INTO `resource_categories` (`name`, `path`, `type`) VALUES 
('cat', 'cat', 'image'),
('cat_voice', 'voice_haqi', 'voice'),
('stress', 'bluelock', 'image'),
('genshin', '原神牛逼', 'image'),
('mc', '鸣潮', 'image'),
('司云烟', 'sound_vioce', 'voice');

-- 示例：给 'cat' 分类插入资源 (假设 content 为 URL)
-- INSERT INTO `resource_items` (`category_id`, `content`) VALUES 
-- ((SELECT id FROM resource_categories WHERE name = 'cat'), 'https://example.com/cat1.jpg');
