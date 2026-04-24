-- ตาราง min/max ต่อตู้ (CabinetItemSetting → app_cabinet_item_settings)
-- ไม่มี FK ที่ cabinet_id — เก็บค่าเท่านั้น

CREATE TABLE IF NOT EXISTS `app_cabinet_item_settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `cabinet_id` INT NOT NULL,
  `item_code` VARCHAR(25) NOT NULL,
  `stock_min` INT NULL,
  `stock_max` INT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
