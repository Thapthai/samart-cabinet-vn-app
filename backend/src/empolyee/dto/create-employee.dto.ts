import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

function toIsUserFlag(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 1 || value === '1') return 1;
  if (value === false || value === 0 || value === '0') return 0;
  return undefined;
}

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  EmpCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  FirstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  LastName?: string;

  /** 1 = ใช้งาน (ค่าเริ่มต้น), 0 = ปิด */
  @IsOptional()
  @Transform(({ value }) => toIsUserFlag(value))
  @IsIn([0, 1])
  IsUser?: number;
}
