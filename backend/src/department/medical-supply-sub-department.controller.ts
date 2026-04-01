import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { MedicalSupplySubDepartmentService } from './medical-supply-sub-department.service';
import {
  CreateMedicalSupplySubDepartmentDto,
  UpdateMedicalSupplySubDepartmentDto,
} from './dto/medical-supply-sub-department.dto';

/** เส้นทางเก่า medical-supply-usage-types ยังรองรับ (bookmark / client เดิม) */
@Controller(['medical-supply-sub-departments', 'medical-supply-usage-types'])
export class MedicalSupplySubDepartmentController {
  constructor(private readonly service: MedicalSupplySubDepartmentService) {}

  @Get()
  list() {
    return this.service.findAll();
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateMedicalSupplySubDepartmentDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMedicalSupplySubDepartmentDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
