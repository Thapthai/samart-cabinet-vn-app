-- Junction: cabinet ↔ medical supply sub-department (many-to-many)

CREATE TABLE IF NOT EXISTS `app_cabinet_sub_departments` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `cabinet_id` INT NOT NULL,
    `sub_department_id` INT NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    `description` TEXT NULL,
    `sort_order` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE INDEX `app_cabinet_sub_departments_cabinet_id_sub_department_id_key` (`cabinet_id`, `sub_department_id`),
    INDEX `app_cabinet_sub_departments_cabinet_id_idx` (`cabinet_id`),
    INDEX `app_cabinet_sub_departments_sub_department_id_idx` (`sub_department_id`),
    CONSTRAINT `app_cabinet_sub_departments_cabinet_id_fkey` FOREIGN KEY (`cabinet_id`) REFERENCES `app_cabinets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `app_cabinet_sub_departments_sub_department_id_fkey` FOREIGN KEY (`sub_department_id`) REFERENCES `app_sub_departments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
