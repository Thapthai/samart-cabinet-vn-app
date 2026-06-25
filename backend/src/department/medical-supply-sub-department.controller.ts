import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { StaffDepartmentScopeService } from '../staff/staff-department-scope.service';
import { MedicalSupplySubDepartmentService } from './medical-supply-sub-department.service';
import {
  CreateMedicalSupplySubDepartmentDto,
  UpdateMedicalSupplySubDepartmentDto,
} from './dto/medical-supply-sub-department.dto';

/** เส้นทางเก่า medical-supply-usage-types ยังรองรับ (bookmark / client เดิม) */
@Controller(['medical-supply-sub-departments', 'medical-supply-usage-types'])
export class MedicalSupplySubDepartmentController {
  constructor(
    private readonly service: MedicalSupplySubDepartmentService,
    private readonly staffDepartmentScope: StaffDepartmentScopeService,
  ) {}

  @Get()
  async list(@Req() req: Request) {
    const staff = await this.staffDepartmentScope.resolveActiveStaffUser(req);
    if (!staff) {
      return this.service.findAll();
    }
    const allowed = await this.staffDepartmentScope.resolveAllowedDepartmentIds(req);
    return this.service.findAll(allowed);
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
