import { IsEmail, IsString, IsOptional, IsBoolean, IsNumber, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class StaffLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  roleType?: string;
}

export class CreateStaffUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  fname: string;

  @IsString()
  @MinLength(2)
  lname: string;

  @IsOptional()
  @IsString()
  role_code?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  role_id?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  department_id?: number;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  expires_at?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  /** รหัสพนักงานจากตาราง employee — ต้องไม่ซ้ำกับ user อื่น */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  emp_code?: string | null;
}

export class UpdateStaffUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  fname?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  lname?: string;

  @IsOptional()
  @IsString()
  role_code?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  role_id?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  department_id?: number | null;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  expires_at?: string;

  /** รหัสพนักงาน — ส่ง null หรือสตริงว่างเพื่อยกเลิกการผูก */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  emp_code?: string | null;
}

export class RegenerateClientSecretDto {
  @IsOptional()
  @IsString()
  expires_at?: string;
}
