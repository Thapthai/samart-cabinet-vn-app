-- StaffRole → แผนกหลัก (department.ID) แทน sub_department_id

ALTER TABLE `app_staff_role_permission_departments` ADD COLUMN `department_id` INTEGER NULL;

UPDATE `app_staff_role_permission_departments` p
INNER JOIN `app_sub_departments` s ON s.id = p.sub_department_id
SET p.department_id = s.department_id;

DELETE FROM `app_staff_role_permission_departments` WHERE `department_id` IS NULL;

DELETE p1 FROM `app_staff_role_permission_departments` p1
INNER JOIN `app_staff_role_permission_departments` p2
  ON p1.role_id = p2.role_id AND p1.department_id = p2.department_id AND p1.id > p2.id;

ALTER TABLE `app_staff_role_permission_departments` MODIFY `department_id` INTEGER NOT NULL;

ALTER TABLE `app_staff_role_permission_departments` DROP FOREIGN KEY `app_staff_role_permission_departments_sub_department_id_fkey`;

DROP INDEX `uniq_role_sub_department` ON `app_staff_role_permission_departments`;

ALTER TABLE `app_staff_role_permission_departments` DROP COLUMN `sub_department_id`;

CREATE UNIQUE INDEX `uniq_role_department` ON `app_staff_role_permission_departments` (`role_id`, `department_id`);

ALTER TABLE `app_staff_role_permission_departments`
ADD CONSTRAINT `app_staff_role_permission_departments_department_id_fkey`
FOREIGN KEY (`department_id`) REFERENCES `department` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE;
