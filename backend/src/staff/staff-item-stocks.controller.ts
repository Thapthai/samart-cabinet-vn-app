import { BadRequestException, Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ItemService } from '../item/item.service';
import { StaffDepartmentScopeService } from './staff-department-scope.service';

/** รายการแจ้งคืน / สต็อกที่รอคืน — Staff ต้องระบุ cabinet_id */
@Controller('staff/item-stocks')
export class StaffItemStocksController {
  constructor(
    private readonly itemService: ItemService,
    private readonly staffDepartmentScope: StaffDepartmentScopeService,
  ) {}

  @Get('will-return')
  async willReturn(
    @Req() req: Request,
    @Query('cabinet_id') cabinet_id: string,
    @Query('department_id') department_id?: string,
    @Query('item_code') item_code?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
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

    const filters: {
      department_id?: number;
      cabinet_id: number;
      item_code?: string;
      start_date?: string;
      end_date?: string;
    } = { cabinet_id: cabinetId };
    if (departmentId != null) filters.department_id = departmentId;
    if (item_code != null && item_code.trim() !== '') filters.item_code = item_code.trim();
    if (start_date != null && start_date.trim() !== '') filters.start_date = start_date.trim();
    if (end_date != null && end_date.trim() !== '') filters.end_date = end_date.trim();

    return this.itemService.findAllItemStockWillReturn(filters);
  }
}
