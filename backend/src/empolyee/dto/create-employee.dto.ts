import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

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
}
