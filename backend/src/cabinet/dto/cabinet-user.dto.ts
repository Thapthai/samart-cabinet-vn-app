import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/** ผู้ใช้ตู้ (ตาราง `users`) + ผูก `user_cabinet` — user_cabinet.cabinet_id = app_cabinets.stock_id */
export class CreateCabinetUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  user_name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  emp_code?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  password?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Type(() => Number)
  @ArrayMaxSize(200)
  cabinet_ids?: number[];
}

/** แก้ไขผู้ใช้ตู้ทำได้แค่ซิงก์ตู้ — ไม่อัปเดตตาราง `users` */
export class UpdateCabinetUserDto {
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Type(() => Number)
  @ArrayMaxSize(200)
  cabinet_ids?: number[];
}
