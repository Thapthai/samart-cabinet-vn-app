-- ระดับ Role: 1 = สูงสุด, 3 = ต่ำสุด
ALTER TABLE `app_microservice_staff_roles`
ADD COLUMN `hierarchy_level` INTEGER NOT NULL DEFAULT 3;
