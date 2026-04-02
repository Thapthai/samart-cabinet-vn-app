import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

/** ตั้งค่ารายการแผนกหลักที่ role อนุญาต — แทนที่ทั้งชุด (ว่าง = ไม่จำกัดแผนก) */
export class SetStaffRolePermissionDepartmentsDto {
  @IsOptional()
  @IsString()
  role_code?: string;

  @IsOptional()
  @IsInt()
  role_id?: number;

  @IsArray()
  @IsInt({ each: true })
  department_ids: number[];
}
