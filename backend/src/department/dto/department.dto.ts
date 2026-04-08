import { IsString, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDepartmentDto {
  @IsOptional()
  @IsString()
  DepName?: string;

  @IsOptional()
  @IsString()
  DepName2?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  IsCancel?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  DivID?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sort?: number;

  @IsOptional()
  @IsString()
  RefDepID?: string;
}

export class UpdateDepartmentDto extends CreateDepartmentDto {}

export class CreateCabinetDepartmentDto {
  @IsInt()
  @Type(() => Number)
  cabinet_id: number;

  @IsInt()
  @Type(() => Number)
  department_id: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateCabinetDepartmentDto {
  @IsInt()
  @Type(() => Number)
  cabinet_id: number;

  @IsInt()
  @Type(() => Number)
  department_id: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateCabinetSubDepartmentDto {
  @IsInt()
  @Type(() => Number)
  cabinet_id: number;

  @IsInt()
  @Type(() => Number)
  sub_department_id: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sort_order?: number;
}

export class UpdateCabinetSubDepartmentDto {
  @IsInt()
  @Type(() => Number)
  cabinet_id: number;

  @IsInt()
  @Type(() => Number)
  sub_department_id: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sort_order?: number;
}
