-- ตาราง app_users — สอดคล้องกับ model User ใน schema.prisma (บรรทัด 11–47)

CREATE TABLE `app_users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(255) NULL,
    `fname` VARCHAR(191) NOT NULL,
    `lname` VARCHAR(191) NOT NULL,
    `department_id` INTEGER NULL,
    `emp_code` VARCHAR(20) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `email_verified` BOOLEAN NOT NULL DEFAULT false,
    `preferred_auth_method` VARCHAR(191) NOT NULL DEFAULT 'jwt',
    `last_login_at` DATETIME(3) NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `client_secret` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME(3) NULL,
    `is_admin` BOOLEAN NOT NULL DEFAULT false,
    `role_id` INTEGER NULL,
    `two_factor_enabled` BOOLEAN NOT NULL DEFAULT false,
    `two_factor_secret` VARCHAR(191) NULL,
    `backup_codes` TEXT NULL,
    `two_factor_verified_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `app_users_email_key` (`email`),
    UNIQUE INDEX `app_users_client_id_key` (`client_id`),
    INDEX `app_users_department_id_idx` (`department_id`),
    INDEX `app_users_role_id_idx` (`role_id`),
    UNIQUE INDEX `app_users_emp_code_key` (`emp_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- FK ไป role (ตาราง app_staff_roles ต้องมีอยู่แล้ว)
ALTER TABLE `app_users`
ADD CONSTRAINT `app_users_role_id_fkey`
FOREIGN KEY (`role_id`) REFERENCES `app_staff_roles` (`id`)
ON DELETE SET NULL ON UPDATE CASCADE;

-- FK ไปแผนกหลัก (ชื่อตารางจาก @@map("department") และคีย์หลัก ID)
ALTER TABLE `app_users`
ADD CONSTRAINT `app_users_department_id_fkey`
FOREIGN KEY (`department_id`) REFERENCES `department` (`ID`)
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `app_users`
ADD CONSTRAINT `app_users_emp_code_fkey`
FOREIGN KEY (`emp_code`) REFERENCES `employee` (`EmpCode`)
ON DELETE SET NULL ON UPDATE CASCADE;