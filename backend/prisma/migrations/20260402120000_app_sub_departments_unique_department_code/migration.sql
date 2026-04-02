-- `code` ไม่ซ้ำทั้งตาราง (ถ้ามี code ซ้ำอยู่แล้ว migration จะล้ม — ต้องแก้ข้อมูลก่อน)
-- ถ้าเคยสร้าง index ชื่อ app_sub_departments_department_id_code_key ไว้แล้ว ให้ DROP ก่อนแล้วค่อยรัน migration นี้
CREATE UNIQUE INDEX `app_sub_departments_code_key` ON `app_sub_departments` (`code`);
