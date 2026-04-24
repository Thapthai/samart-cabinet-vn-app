-- ลบ FOREIGN KEY ของ app_cabinet_item_settings.cabinet_id (คอลัมน์เก็บค่าเท่านั้น)
--
-- รัน: npx prisma migrate deploy
-- ถ้ารันใน GUI ให้รันทั้งไฟล์ในครั้งเดียว (Execute script / allow multi-statements)

SET @fkname = (
  SELECT `kcu`.`CONSTRAINT_NAME`
  FROM `information_schema`.`KEY_COLUMN_USAGE` AS `kcu`
  WHERE `kcu`.`TABLE_SCHEMA` = DATABASE()
    AND `kcu`.`TABLE_NAME` = 'app_cabinet_item_settings'
    AND `kcu`.`COLUMN_NAME` = 'cabinet_id'
    AND `kcu`.`REFERENCED_TABLE_NAME` IS NOT NULL
  LIMIT 1
);
SET @drop = IF(
  @fkname IS NOT NULL,
  CONCAT('ALTER TABLE `app_cabinet_item_settings` DROP FOREIGN KEY `', @fkname, '`'),
  'SELECT 1'
);
PREPARE `stmt_drop_fk` FROM @drop;
EXECUTE `stmt_drop_fk`;
DEALLOCATE PREPARE `stmt_drop_fk`;
