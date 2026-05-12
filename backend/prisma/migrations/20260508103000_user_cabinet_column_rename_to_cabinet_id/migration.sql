-- Rename legacy column to cabinet_id (values remain app_cabinets.stock_id).
-- Skip manually if your DB already uses column name `cabinet_id`.
ALTER TABLE `user_cabinet` CHANGE COLUMN `cabinet_finger_id` `cabinet_id` INT NOT NULL;
