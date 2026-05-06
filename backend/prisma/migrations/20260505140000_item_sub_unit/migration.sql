-- AlterTable
ALTER TABLE `item` ADD COLUMN `sub_unit_id` INTEGER NULL,
    ADD COLUMN `sub_unit_qty` INTEGER NULL;

-- CreateIndex
CREATE INDEX `idx_item_sub_unit_id` ON `item`(`sub_unit_id`);

-- AddForeignKey
ALTER TABLE `item` ADD CONSTRAINT `item_sub_unit_id_fkey` FOREIGN KEY (`sub_unit_id`) REFERENCES `units`(`ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- create table item_sub_unit
ALTER TABLE samart_cabinet_er.item ADD sub_unit_id INT NULL;

-- create idx_item_sub_unit_id
ALTER TABLE samart_cabinet_er.item ADD sub_unit_qty INT NULL;
