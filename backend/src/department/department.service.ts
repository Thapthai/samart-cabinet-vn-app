import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCabinetDepartmentDto,
  CreateDepartmentDto,
  UpdateCabinetDepartmentDto,
  UpdateDepartmentDto,
} from './dto/department.dto';
import { CreateCabinetDto, UpdateCabinetDto } from './dto/cabinet.dto';

@Injectable()
export class DepartmentService {
  private readonly logger = new Logger(DepartmentService.name);
  private readonly HOSPITAL_PREFIX = 'VTN';

  constructor(private prisma: PrismaService) { }

  async getAllDepartments(query?: { page?: number; limit?: number; keyword?: string }) {
    try {
      const page = query?.page || 1;
      const limit = Math.min(500, Math.max(1, query?.limit || 10));
      const skip = (page - 1) * limit;
      const where: any = {};
      const keyword = typeof query?.keyword === 'string' ? query.keyword.trim() : '';
      if (keyword) {
        where.OR = [
          { DepName: { contains: keyword } },
          { DepName2: { contains: keyword } },
        ];
      }
      const [departments, total] = await Promise.all([
        this.prisma.department.findMany({
          where,
          skip,
          take: limit,
          orderBy: { ID: 'asc' },
          select: {
            ID: true,
            DepName: true,
            DepName2: true,
            RefDepID: true,
          },
        }),
        this.prisma.department.count({ where }),
      ]);
      return { success: true, data: departments, total, page, limit, lastPage: Math.ceil(total / limit) };
    } catch (err: any) {
      this.logger.error(`getAllDepartments failed: ${err?.message ?? err}`);
      throw err;
    }
  }

  async createDepartment(dto: CreateDepartmentDto) {
    const depName = (dto.DepName ?? '').trim();
    const depName2 = (dto.DepName2 ?? '').trim();
    if (!depName && !depName2) {
      return { success: false, message: 'กรุณากรอกชื่อแผนกหรือชื่อย่ออย่างน้อยหนึ่งช่อง' };
    }
    try {
      const row = await this.prisma.department.create({
        data: {
          DepName: depName || null,
          DepName2: depName2 || null,
          RefDepID: dto.RefDepID?.trim() ? dto.RefDepID.trim() : null,
          IsCancel: dto.IsCancel ?? 0,
          ...(dto.DivID !== undefined && dto.DivID !== null ? { DivID: dto.DivID } : {}),
          ...(dto.sort !== undefined && dto.sort !== null ? { sort: dto.sort } : {}),
        },
        select: { ID: true, DepName: true, DepName2: true, RefDepID: true },
      });
      return { success: true, message: 'สร้างแผนกหลักสำเร็จ', data: row };
    } catch (err: any) {
      this.logger.error(`createDepartment: ${err?.message ?? err}`);
      return { success: false, message: err?.message || 'ไม่สามารถสร้างแผนกหลักได้' };
    }
  }

  async updateDepartment(id: number, dto: UpdateDepartmentDto) {
    const existing = await this.prisma.department.findUnique({
      where: { ID: id },
      select: { ID: true, DepName: true, DepName2: true, RefDepID: true },
    });
    if (!existing) {
      return { success: false, message: 'ไม่พบแผนกหลัก' };
    }

    const mergedName =
      dto.DepName !== undefined ? (dto.DepName ?? '').trim() : (existing.DepName ?? '').trim();
    const mergedName2 =
      dto.DepName2 !== undefined ? (dto.DepName2 ?? '').trim() : (existing.DepName2 ?? '').trim();
    if (!mergedName && !mergedName2) {
      return { success: false, message: 'กรุณากรอกชื่อแผนกหรือชื่อย่ออย่างน้อยหนึ่งช่อง' };
    }

    try {
      const row = await this.prisma.department.update({
        where: { ID: id },
        data: {
          ...(dto.DepName !== undefined ? { DepName: (dto.DepName ?? '').trim() || null } : {}),
          ...(dto.DepName2 !== undefined ? { DepName2: (dto.DepName2 ?? '').trim() || null } : {}),
          ...(dto.RefDepID !== undefined
            ? { RefDepID: dto.RefDepID?.trim() ? dto.RefDepID.trim() : null }
            : {}),
          ...(dto.IsCancel !== undefined && dto.IsCancel !== null ? { IsCancel: dto.IsCancel } : {}),
          ...(dto.DivID !== undefined && dto.DivID !== null ? { DivID: dto.DivID } : {}),
          ...(dto.sort !== undefined && dto.sort !== null ? { sort: dto.sort } : {}),
        },
        select: { ID: true, DepName: true, DepName2: true, RefDepID: true },
      });
      return { success: true, message: 'อัปเดตแผนกหลักแล้ว', data: row };
    } catch (err: any) {
      this.logger.error(`updateDepartment: ${err?.message ?? err}`);
      return { success: false, message: err?.message || 'ไม่สามารถอัปเดตแผนกหลักได้' };
    }
  }

  private async generateCabinetCode(options: {
    hospitalPrefix?: string;
    department_id?: number;
    stock_id?: number;
  }): Promise<{ cabinet_code: string; stock_id: number }> {
    const prefix = options.hospitalPrefix ?? this.HOSPITAL_PREFIX;
    let refDepId = '';
    if (options.department_id) {
      const dept = await this.prisma.department.findUnique({
        where: { ID: options.department_id },
        select: { RefDepID: true },
      });
      if (dept?.RefDepID?.trim()) refDepId = dept.RefDepID.trim().toUpperCase();
    }
    let stock_id: number;
    if (options.stock_id != null && options.stock_id > 0) {
      stock_id = options.stock_id;
    } else {
      const maxStock = await this.prisma.cabinet.findFirst({
        where: { stock_id: { not: null } },
        select: { stock_id: true },
        orderBy: { stock_id: 'desc' },
      });
      stock_id = (maxStock?.stock_id ?? 0) + 1;
    }
    const segment = refDepId ? `${prefix}-${refDepId}` : prefix;
    const cabinet_code = `${segment}-${String(stock_id).padStart(3, '0')}`;
    return { cabinet_code, stock_id };
  }

  async createCabinet(data: CreateCabinetDto) {
    try {
      const { department_id, ...rest } = data;
      let cabinet_code = data.cabinet_code?.trim();
      let stock_id = data.stock_id;
      if (!cabinet_code || stock_id == null) {
        const generated = await this.generateCabinetCode({
          hospitalPrefix: this.HOSPITAL_PREFIX,
          department_id,
          stock_id: stock_id ?? undefined,
        });
        if (!cabinet_code) cabinet_code = generated.cabinet_code;
        if (stock_id == null) stock_id = generated.stock_id;
      }
      const cabinet = await this.prisma.cabinet.create({
        data: {
          ...rest,
          cabinet_code,
          stock_id,
          ...(department_id ? { cabinet_status: 'USED' } : {}),
        },
      });
      if (department_id) {
        const department = await this.prisma.department.findUnique({
          where: { ID: department_id },
          select: { ID: true },
        });
        if (department) {
          await this.prisma.cabinetDepartment.create({
            data: { cabinet_id: cabinet.id, department_id, status: 'ACTIVE' },
          });
        }
      }
      const cabinetWithDepts = await this.prisma.cabinet.findUnique({
        where: { id: cabinet.id },
        include: {
          cabinetDepartments: {
            select: { id: true, department_id: true, status: true },
          },
        },
      });
      return { success: true, message: 'Cabinet created successfully', data: cabinetWithDepts ?? cabinet };
    } catch (err: any) {
      this.logger.error(`Error creating cabinet: ${err.message}`);
      return { success: false, message: 'Failed to create cabinet', error: err.message };
    }
  }

  async getAllCabinets(query?: { page?: number; limit?: number; keyword?: string }) {
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query?.keyword) {
      where.OR = [
        { cabinet_name: { contains: query.keyword } },
        { cabinet_code: { contains: query.keyword } },
      ];
    }
    const [cabinets, total] = await Promise.all([
      this.prisma.cabinet.findMany({
        where,
        skip,
        take: limit,
        include: {
          cabinetDepartments: {
            select: { id: true, department_id: true, status: true },
          },
        },
      }),
      this.prisma.cabinet.count({ where }),
    ]);
    return { success: true, data: cabinets, total, page, limit, lastPage: Math.ceil(total / limit) };
  }

  async getCabinetById(id: number) {
    const cabinet = await this.prisma.cabinet.findUnique({
      where: { id },
    });
    return { success: true, data: cabinet };
  }

  async updateCabinet(id: number, data: UpdateCabinetDto) {
    try {
      const cabinet = await this.prisma.cabinet.update({
        where: { id },
        data,
      });
      return { success: true, message: 'Cabinet updated successfully', data: cabinet };
    } catch (err: any) {
      this.logger.error(`Error updating cabinet: ${err.message}`);
      return { success: false, message: 'Failed to update cabinet', error: err.message };
    }
  }

  async deleteCabinet(id: number) {
    try {
      await this.prisma.cabinet.delete({ where: { id } });
      return { success: true, message: 'Cabinet deleted successfully' };
    } catch (err: any) {
      this.logger.error(`Error deleting cabinet: ${err.message}`);
      return { success: false, message: 'Failed to delete cabinet', error: err.message };
    }
  }

  async createCabinetDepartment(data: CreateCabinetDepartmentDto) {
    try {

      const [cabinet, department] = await Promise.all([
        this.prisma.cabinet.findUnique({ where: { id: data.cabinet_id } }),
        this.prisma.department.findUnique({
          where: { ID: data.department_id },
          select: { ID: true, DepName: true, DepName2: true },
        }),
      ]);

      if (!cabinet || !department) {
        return { success: false, message: 'Validation failed - data not found' };
      }
      const existing = await this.prisma.cabinetDepartment.findFirst({
        where: { cabinet_id: data.cabinet_id },
      });
      if (existing) return { success: false, message: 'Cabinet already used' };
      const mapping = await this.prisma.cabinetDepartment.create({
        data: {
          cabinet_id: data.cabinet_id,
          department_id: data.department_id,
          status: data.status || 'ACTIVE',
          description: data.description,
        },
      });
      await this.prisma.cabinet.update({
        where: { id: data.cabinet_id },
        data: { cabinet_status: 'USED' },
      });
      return { success: true, message: 'Cabinet-Department mapping created successfully', data: { mapping, cabinet, department } };
    } catch (err: any) {
      this.logger.error(`Error creating Cabinet-Department: ${err.message}`);
      return { success: false, message: 'Database error occurred', error: err.message };
    }
  }

  async getCabinetDepartments(query?: { cabinet_id?: number; department_id?: number; status?: string; keyword?: string; only_weighing_cabinets?: boolean }) {
    try {
      const where: any = {};
      if (query?.department_id) where.department_id = query.department_id;
      if (query?.status) where.status = query.status;
      if (query?.only_weighing_cabinets) {
        const slotStockIds = await this.prisma.itemSlotInCabinet.findMany({
          select: { StockID: true },
          distinct: ['StockID'],
        });
        const stockIds = [...new Set(slotStockIds.map((s) => s.StockID))].filter((id) => id != null && id > 0);
        if (stockIds.length === 0) {
          return { success: true, data: [], total: 0, page: 1, limit: 10, lastPage: 0 };
        }
        const cabinets = await this.prisma.cabinet.findMany({
          where: { stock_id: { in: stockIds } },
          select: { id: true },
        });
        const cabinetIds = cabinets.map((c) => c.id);
        if (cabinetIds.length === 0) {
          return { success: true, data: [], total: 0, page: 1, limit: 10, lastPage: 0 };
        }
        where.cabinet_id = { in: cabinetIds };
      }
      if (query?.keyword?.trim()) {
        const matchingCabinets = await this.prisma.cabinet.findMany({
          where: {
            ...(where.cabinet_id ? { id: where.cabinet_id } : {}),
            OR: [
              { cabinet_name: { contains: query.keyword } },
              { cabinet_code: { contains: query.keyword } },
            ],
          },
          select: { id: true },
        });
        const ids = matchingCabinets.map((c) => c.id);
        if (ids.length === 0) {
          return { success: true, data: [], total: 0, page: 1, limit: 10, lastPage: 0 };
        }
        where.cabinet_id = query?.cabinet_id ? query.cabinet_id : { in: ids };
      } else if (query?.cabinet_id) {
        where.cabinet_id = query.cabinet_id;
      }
      const mappings = await this.prisma.cabinetDepartment.findMany({
        where,
        include: {
          department: { select: { ID: true, DepName: true, DepName2: true } },
          cabinet: { select: { id: true, cabinet_name: true, cabinet_code: true, cabinet_status: true, stock_id: true } },
        },
        orderBy: { cabinet_id: 'asc' },
      });
      const mappingsWithCount = await Promise.all(
        mappings.map(async (m) => {
          const stockId = m.cabinet?.stock_id;
          let itemstock_count = 0;
          let itemstock_dispensed_count = 0;
          let weighing_slot_count = 0;
          let weighing_dispense_count = 0;
          let weighing_refill_count = 0;
          if (stockId) {
            [itemstock_count, itemstock_dispensed_count, weighing_slot_count, weighing_dispense_count, weighing_refill_count] = await Promise.all([
              this.prisma.itemStock.count({ where: { StockID: stockId, IsStock: true } }),
              this.prisma.itemStock.count({ where: { StockID: stockId, IsStock: false } }),
              this.prisma.itemSlotInCabinet.count({ where: { StockID: stockId } }),
              this.prisma.itemSlotInCabinetDetail.count({ where: { StockID: stockId, Sign: '-' } }),
              this.prisma.itemSlotInCabinetDetail.count({ where: { StockID: stockId, Sign: '+' } }),
            ]);
          }
          return { ...m, itemstock_count, itemstock_dispensed_count, weighing_slot_count, weighing_dispense_count, weighing_refill_count };
        }),
      );
      return {
        success: true,
        data: mappingsWithCount,
        total: mappingsWithCount.length,
        page: 1,
        limit: 10,
        lastPage: Math.ceil(mappingsWithCount.length / 10),
      };
    } catch (err: any) {
      this.logger.error(`Error fetching mappings: ${err.message}`);
      return { success: false, message: 'Failed to fetch mappings', error: err.message };
    }
  }

  async updateCabinetDepartment(id: number, data: UpdateCabinetDepartmentDto) {
    try {
      const [cabinet, department, currentMapping] = await Promise.all([
        this.prisma.cabinet.findUnique({ where: { id: data.cabinet_id } }),
        // อย่าโหลดทุกคอลัมน์ของ department — บาง DB มีค่าใน IsCancel ฯลฯ ที่ Prisma แปลงเป็น Int ไม่ได้
        this.prisma.department.findUnique({
          where: { ID: data.department_id },
          select: { ID: true, DepName: true, DepName2: true },
        }),
        this.prisma.cabinetDepartment.findUnique({ where: { id } }),
      ]);
      if (!cabinet || !department) return { success: false, message: 'Cabinet or Department not found' };
      if (!currentMapping) return { success: false, message: 'CabinetDepartment mapping not found' };
      if (currentMapping.cabinet_id === data.cabinet_id) {
        const mapping = await this.prisma.cabinetDepartment.update({
          where: { id },
          data: { department_id: data.department_id, status: data.status, description: data.description },
          include: { cabinet: true, department: { select: { ID: true, DepName: true, DepName2: true } } },
        });
        return { success: true, message: 'Cabinet-Department mapping updated successfully', data: mapping };
      }
      const existing = await this.prisma.cabinetDepartment.findFirst({
        where: { cabinet_id: data.cabinet_id, id: { not: id } },
      });
      if (existing) return { success: false, message: 'New cabinet is already mapped to another department' };
      const oldCabinetId = currentMapping.cabinet_id;
      const mapping = await this.prisma.cabinetDepartment.update({
        where: { id },
        data: {
          cabinet_id: data.cabinet_id,
          department_id: data.department_id,
          status: data.status,
          description: data.description,
        },
        include: { cabinet: true, department: { select: { ID: true, DepName: true, DepName2: true } } },
      });
      if (data.cabinet_id) {
        await this.prisma.cabinet.update({ where: { id: data.cabinet_id }, data: { cabinet_status: 'USED' } });
      }
      if (oldCabinetId) {
        const remaining = await this.prisma.cabinetDepartment.count({ where: { cabinet_id: oldCabinetId } });
        if (remaining === 0) {
          await this.prisma.cabinet.update({ where: { id: oldCabinetId }, data: { cabinet_status: 'AVAILIABLE' } });
        }
      }
      return { success: true, message: 'Cabinet-Department mapping updated successfully', data: mapping };
    } catch (err: any) {
      this.logger.error(`Error updating mapping: ${err.message}`);
      return { success: false, message: 'Failed to update mapping', error: err.message };
    }
  }

  async deleteCabinetDepartment(id: number) {
    const mapping = await this.prisma.cabinetDepartment.findUnique({ where: { id } });
    if (!mapping) return { success: false, message: 'Cabinet-Department mapping not found' };
    const cabinetId = mapping.cabinet_id;
    await this.prisma.cabinetDepartment.delete({ where: { id } });
    if (cabinetId) {
      const remaining = await this.prisma.cabinetDepartment.count({ where: { cabinet_id: cabinetId } });
      if (remaining === 0) {
        await this.prisma.cabinet.update({ where: { id: cabinetId }, data: { cabinet_status: 'AVAILIABLE' } });
      }
    }
    return { success: true, message: 'Cabinet-Department mapping deleted successfully' };
  }
}
