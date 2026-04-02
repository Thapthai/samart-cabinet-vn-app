-- StaffRole → หลายแผนกย่อยที่อนุญาตดูได้ (ไม่มีแถว = ไม่จำกัดแผนก)
CREATE TABLE `app_staff_role_permission_departments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `role_id` INTEGER NOT NULL,
    `department_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `uniq_role_department` (`role_id`, `department_id`),
    INDEX `idx_srpd_role_id` (`role_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `app_staff_role_permission_departments`
ADD CONSTRAINT `app_staff_role_permission_departments_role_id_fkey`
FOREIGN KEY (`role_id`) REFERENCES `app_staff_roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `app_staff_role_permission_departments`
ADD CONSTRAINT `app_staff_role_permission_departments_sub_department_id_fkey`
FOREIGN KEY (`sub_department_id`) REFERENCES `app_sub_departments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
