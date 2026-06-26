-- เปลี่ยนสิทธิ์แผนกหลักจากระดับ StaffRole (role_id) เป็นระดับผู้ใช้ (user_id)
-- ตารางเดิม app_staff_role_permission_departments (role_id) -> ตารางใหม่ app_staff_permission_departments (user_id)
DROP TABLE IF EXISTS `app_staff_role_permission_departments`;

CREATE TABLE `app_staff_permission_departments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `department_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `uniq_user_department` (`user_id`, `department_id`),
    INDEX `idx_spd_user_id` (`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `app_staff_permission_departments`
ADD CONSTRAINT `app_staff_permission_departments_user_id_fkey`
FOREIGN KEY (`user_id`) REFERENCES `app_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `app_staff_permission_departments`
ADD CONSTRAINT `app_staff_permission_departments_department_id_fkey`
FOREIGN KEY (`department_id`) REFERENCES `department` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE;
