CREATE TABLE IF NOT EXISTS `app_sub_departments` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `department_id` INT NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `status` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
 
-- cabinet model → @@map("app_cabinets")
-- รันได้บน MySQL / MariaDB (InnoDB, utf8mb4)

CREATE TABLE IF NOT EXISTS `app_cabinets` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `cabinet_name` VARCHAR(255) NULL,
    `cabinet_code` VARCHAR(255) NULL,
    `cabinet_type` VARCHAR(255) NULL,
    `cabinet_status` VARCHAR(255) NULL DEFAULT 'ACTIVE',
    `stock_id` INT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `app_cabinets_stock_id_key` (`stock_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
