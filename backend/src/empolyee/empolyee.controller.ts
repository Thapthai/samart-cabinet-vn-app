import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { EmpolyeeService } from './empolyee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Controller('employees')
export class EmpolyeeController {
  constructor(private readonly empolyeeService: EmpolyeeService) { }

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('keyword') keyword?: string,
  ) {
    return this.empolyeeService.findAll(page, limit, keyword);
  }

  @Get(':empCode')
  findOne(@Param('empCode') empCode: string) {
    return this.empolyeeService.findOne(empCode);
  }

  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.empolyeeService.create(dto);
  }

  @Put(':empCode')
  update(@Param('empCode') empCode: string, @Body() dto: UpdateEmployeeDto) {
    return this.empolyeeService.update(empCode, dto);
  }

  @Delete(':empCode')
  remove(@Param('empCode') empCode: string) {
    return this.empolyeeService.remove(empCode);
  }
}
