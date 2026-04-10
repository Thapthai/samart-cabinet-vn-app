-- CreateTable
CREATE TABLE `app_daily_cabinet_stock_report_archives` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `report_date` VARCHAR(10) NOT NULL,
    `format` VARCHAR(16) NOT NULL,
    `filter_key` VARCHAR(64) NOT NULL DEFAULT 'ALL',
    `file_path` VARCHAR(512) NOT NULL,
    `file_size` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_daily_cab_stock_archive`(`report_date`, `format`, `filter_key`),
    INDEX `idx_daily_cab_stock_report_date`(`report_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
