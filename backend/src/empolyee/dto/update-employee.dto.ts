import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  FirstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  LastName?: string;
}
