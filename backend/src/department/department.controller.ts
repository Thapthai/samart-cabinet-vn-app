import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, ParseIntPipe, Post, Put, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { DepartmentService } from './department.service';
import { StaffDepartmentScopeService } from '../staff/staff-department-scope.service';
import {
  CreateCabinetDepartmentDto,
  CreateDepartmentDto,
  UpdateCabinetDepartmentDto,
  UpdateDepartmentDto,
} from './dto/department.dto';
import { CreateCabinetDto, UpdateCabinetDto } from './dto/cabinet.dto';

@Controller('departments')
export class DepartmentController {
  constructor(
    private readonly departmentService: DepartmentService,
    private readonly staffDepartmentScope: StaffDepartmentScopeService,
  ) {}

  @Get()
  async getAllDepartments(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('keyword') keyword?: string,
  ) {
    const allowedDepartmentIds = await this.staffDepartmentScope.resolveAllowedDepartmentIds(req);
    const params = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      keyword: typeof keyword === 'string' && keyword.trim() ? keyword.trim() : undefined,
    };
    try {
      return await this.departmentService.getAllDepartments(params, allowedDepartmentIds);
    } catch (err: any) {
      const message = err?.message ?? String(err);
      throw new HttpException(
        { success: false, error: 'getAllDepartments failed', message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.departmentService.createDepartment(dto);
  }

  @Put(':id')
  async updateDepartment(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDepartmentDto) {
    return this.departmentService.updateDepartment(id, dto);
  }
}

@Controller('cabinets')
export class CabinetController {
  constructor(
    private readonly departmentService: DepartmentService,
    private readonly staffDepartmentScope: StaffDepartmentScopeService,
  ) {}

  @Post()
  create(@Body() dto: CreateCabinetDto) {
    return this.departmentService.createCabinet(dto);
  }

  @Get()
  async getAll(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('keyword') keyword?: string,
  ) {
    const allowedDepartmentIds = await this.staffDepartmentScope.resolveAllowedDepartmentIds(req);
    const query = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      keyword,
    };
    return this.departmentService.getAllCabinets(query, allowedDepartmentIds);
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.departmentService.getCabinetById(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCabinetDto) {
    return this.departmentService.updateCabinet(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.departmentService.deleteCabinet(id);
  }
}

@Controller('cabinet-departments')
export class CabinetDepartmentController {
  constructor(
    private readonly departmentService: DepartmentService,
    private readonly staffDepartmentScope: StaffDepartmentScopeService,
  ) {}

  @Post()
  create(@Body() dto: CreateCabinetDepartmentDto) {
    return this.departmentService.createCabinetDepartment(dto);
  }

  @Get()
  async getAll(
    @Req() req: Request,
    @Query('cabinet_id') cabinet_id?: string,
    @Query('department_id') department_id?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
    @Query('only_weighing_cabinets') only_weighing_cabinets?: string,
  ) {
    const allowedDepartmentIds = await this.staffDepartmentScope.resolveAllowedDepartmentIds(req);
    const query = {
      cabinet_id: cabinet_id ? parseInt(cabinet_id, 10) : undefined,
      department_id: department_id ? parseInt(department_id, 10) : undefined,
      status,
      keyword,
      only_weighing_cabinets: only_weighing_cabinets === 'true' || only_weighing_cabinets === '1',
    };
    return this.departmentService.getCabinetDepartments(query, allowedDepartmentIds);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCabinetDepartmentDto) {
    return this.departmentService.updateCabinetDepartment(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.departmentService.deleteCabinetDepartment(id);
  }
}
