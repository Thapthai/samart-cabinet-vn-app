import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CabinetUsersService } from './cabinet-users.service';
import { CreateCabinetUserDto, UpdateCabinetUserDto } from './dto/cabinet-user.dto';
import { StaffDepartmentScopeService } from '../staff/staff-department-scope.service';

/** ผู้ใช้ในตู้ — อยู่ภายใต้ CabinetModule เส้นทาง `cabinet/users` */
@Controller('cabinet/users')
export class CabinetUsersController {
  constructor(
    private readonly cabinetUsersService: CabinetUsersService,
    private readonly staffDepartmentScope: StaffDepartmentScopeService,
  ) {}

  @Get()
  async findAll(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('keyword') keyword?: string,
    @Query('department_id') department_id?: string,
    @Query('cabinet_id') cabinet_id?: string,
  ) {
    const parseOptId = (q?: string): number | undefined => {
      if (q == null || q === '') return undefined;
      const n = parseInt(q, 10);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    const allowedDepartmentIds = await this.staffDepartmentScope.resolveAllowedDepartmentIds(req);
    return this.cabinetUsersService.findAll(
      {
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        keyword: typeof keyword === 'string' && keyword.trim() ? keyword.trim() : undefined,
        department_id: parseOptId(department_id),
        cabinet_id: parseOptId(cabinet_id),
      },
      allowedDepartmentIds,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cabinetUsersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCabinetUserDto) {
    return this.cabinetUsersService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCabinetUserDto) {
    return this.cabinetUsersService.update(id, dto);
  }
}
