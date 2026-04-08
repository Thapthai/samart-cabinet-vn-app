import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ItemService } from '../item/item.service';
import { StaffDepartmentScopeService } from './staff-department-scope.service';

/**
 * รายการแจ้งคืน / สต็อกที่รอคืน — Staff
 * - ระบุ cabinet_id: ตรวจสิทธิ์ตามตู้
 * - ไม่ระบุ cabinet_id + มี department_id: ทุกตู้ในแผนกนั้น
 * - ไม่ระบุทั้งคู่: ดึงตามช่วงวันที่/คีย์อื่น แล้วกรองตามแผนกที่ role อนุญาต (ถ้ามี)
 */
@Controller('staff/item-stocks')
export class StaffItemStocksController {
  constructor(
    private readonly itemService: ItemService,
    private readonly staffDepartmentScope: StaffDepartmentScopeService,
  ) {}

  @Get('will-return')
  async willReturn(
    @Req() req: Request,
    @Query('cabinet_id') cabinet_id?: string,
    @Query('department_id') department_id?: string,
    @Query('sub_department_id') sub_department_id?: string,
    @Query('item_code') item_code?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
  ) {
    let departmentId: number | undefined;
    if (department_id != null && String(department_id).trim() !== '') {
      const n = parseInt(String(department_id), 10);
      if (!Number.isFinite(n) || n < 1) {
        throw new BadRequestException('department_id ไม่ถูกต้อง');
      }
      departmentId = n;
    }

    const cabinetIdTrim = cabinet_id != null ? String(cabinet_id).trim() : '';

    if (cabinetIdTrim === '') {
      if (departmentId == null) {
        const staff = await this.staffDepartmentScope.resolveActiveStaffUser(req);
        if (!staff) {
          throw new UnauthorizedException('ต้องล็อกอิน Staff');
        }

        let subDepartmentId: number | undefined;
        if (sub_department_id != null && String(sub_department_id).trim() !== '') {
          const sid = parseInt(String(sub_department_id), 10);
          if (!Number.isFinite(sid) || sid < 1) {
            throw new BadRequestException('sub_department_id ไม่ถูกต้อง');
          }
          await this.staffDepartmentScope.assertStaffCanAccessSubDepartment(req, sid);
          subDepartmentId = sid;
        }

        const filters: {
          sub_department_id?: number;
          item_code?: string;
          start_date?: string;
          end_date?: string;
        } = {};
        if (subDepartmentId != null) filters.sub_department_id = subDepartmentId;
        if (item_code != null && item_code.trim() !== '') filters.item_code = item_code.trim();
        if (start_date != null && start_date.trim() !== '') filters.start_date = start_date.trim();
        if (end_date != null && end_date.trim() !== '') filters.end_date = end_date.trim();

        const raw = await this.itemService.findAllItemStockWillReturn(filters);
        if (!raw || (raw as { success?: boolean }).success === false) {
          return raw;
        }
        const allowed = await this.staffDepartmentScope.resolveAllowedDepartmentIds(req);
        let data = (raw as { data?: unknown[] }).data ?? [];
        if (allowed != null) {
          const set = new Set(allowed);
          data = data.filter((row: { department_id?: number | null }) => {
            const did = row.department_id;
            return did != null && set.has(Number(did));
          });
        }
        return { success: true, data };
      }
      await this.staffDepartmentScope.assertStaffDepartmentAccess(req, departmentId);

      let subDepartmentId: number | undefined;
      if (sub_department_id != null && String(sub_department_id).trim() !== '') {
        const sid = parseInt(String(sub_department_id), 10);
        if (!Number.isFinite(sid) || sid < 1) {
          throw new BadRequestException('sub_department_id ไม่ถูกต้อง');
        }
        await this.staffDepartmentScope.assertSubDepartmentBelongsToDepartment(sid, departmentId);
        subDepartmentId = sid;
      }

      const filters: {
        department_id: number;
        sub_department_id?: number;
        item_code?: string;
        start_date?: string;
        end_date?: string;
      } = { department_id: departmentId };
      if (subDepartmentId != null) filters.sub_department_id = subDepartmentId;
      if (item_code != null && item_code.trim() !== '') filters.item_code = item_code.trim();
      if (start_date != null && start_date.trim() !== '') filters.start_date = start_date.trim();
      if (end_date != null && end_date.trim() !== '') filters.end_date = end_date.trim();

      return this.itemService.findAllItemStockWillReturn(filters);
    }

    const cabinetId = parseInt(cabinetIdTrim, 10);
    if (!Number.isFinite(cabinetId) || cabinetId < 1) {
      throw new BadRequestException('cabinet_id ไม่ถูกต้อง');
    }

    await this.staffDepartmentScope.assertStaffCabinetAccess(req, cabinetId, departmentId);

    let subDepartmentId: number | undefined;
    if (sub_department_id != null && String(sub_department_id).trim() !== '') {
      const sid = parseInt(String(sub_department_id), 10);
      if (!Number.isFinite(sid) || sid < 1) {
        throw new BadRequestException('sub_department_id ไม่ถูกต้อง');
      }
      await this.staffDepartmentScope.assertCabinetLinkedSubDepartment(cabinetId, sid);
      subDepartmentId = sid;
    }

    const filters: {
      department_id?: number;
      cabinet_id: number;
      sub_department_id?: number;
      item_code?: string;
      start_date?: string;
      end_date?: string;
    } = { cabinet_id: cabinetId };
    if (departmentId != null) filters.department_id = departmentId;
    if (subDepartmentId != null) filters.sub_department_id = subDepartmentId;
    if (item_code != null && item_code.trim() !== '') filters.item_code = item_code.trim();
    if (start_date != null && start_date.trim() !== '') filters.start_date = start_date.trim();
    if (end_date != null && end_date.trim() !== '') filters.end_date = end_date.trim();

    return this.itemService.findAllItemStockWillReturn(filters);
  }
}
