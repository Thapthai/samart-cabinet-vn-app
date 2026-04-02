import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ItemService } from '../item/item.service';
import { StaffDepartmentScopeService } from './staff-department-scope.service';

/**
 * รายการสต็อกอุปกรณ์ในตู้ — Staff portal เท่านั้น
 * บังคับ cabinet_id เพื่อไม่ดึงข้ามตู้โดยไม่ตั้งใจ
 */
@Controller('staff/items')
export class StaffItemsController {
  constructor(
    private readonly itemService: ItemService,
    private readonly staffDepartmentScope: StaffDepartmentScopeService,
  ) {}

  @Get()
  async findAll(
    @Req() req: Request,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('keyword') keyword?: string,
    @Query('sort_by') sort_by?: string,
    @Query('sort_order') sort_order?: string,
    @Query('cabinet_id') cabinet_id?: string,
    @Query('department_id') department_id?: string,
    @Query('status') status?: string,
  ) {
    if (cabinet_id == null || String(cabinet_id).trim() === '') {
      throw new BadRequestException('กรุณาระบุ cabinet_id');
    }
    const cabinetId = parseInt(String(cabinet_id), 10);
    if (!Number.isFinite(cabinetId) || cabinetId < 1) {
      throw new BadRequestException('cabinet_id ไม่ถูกต้อง');
    }

    const departmentId =
      department_id != null && String(department_id).trim() !== ''
        ? parseInt(String(department_id), 10)
        : undefined;
    if (departmentId != null && (!Number.isFinite(departmentId) || departmentId < 1)) {
      throw new BadRequestException('department_id ไม่ถูกต้อง');
    }

    await this.staffDepartmentScope.assertStaffCabinetAccess(req, cabinetId, departmentId);

    return this.itemService.findAllItems(
      page,
      limit,
      keyword,
      sort_by || 'itemcode',
      sort_order || 'asc',
      cabinetId,
      departmentId,
      status,
    );
  }
}
