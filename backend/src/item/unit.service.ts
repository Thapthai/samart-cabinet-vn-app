import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

function mapUnit(row: {
  ID: number;
  UnitName: string | null;
  IsCancel: boolean | null;
  B_ID: number | null;
}) {
  return {
    id: row.ID,
    unitName: row.UnitName ?? '',
    isCancel: row.IsCancel ?? false,
    bId: row.B_ID ?? null,
  };
}

@Injectable()
export class UnitService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page = 1,
    limit = 20,
    keyword?: string,
    includeCancelled = false,
    onlyCancelled = false,
  ) {
    const take = Math.min(100, Math.max(1, limit));
    const skip = (page - 1) * take;

    const parts: Prisma.UnitWhereInput[] = [];
    if (onlyCancelled) {
      parts.push({ IsCancel: true });
    } else if (!includeCancelled) {
      parts.push({ OR: [{ IsCancel: false }, { IsCancel: null }] });
    }
    if (keyword?.trim()) {
      parts.push({ UnitName: { contains: keyword.trim() } });
    }
    const where: Prisma.UnitWhereInput = parts.length ? { AND: parts } : {};

    const [rows, total] = await Promise.all([
      this.prisma.unit.findMany({
        where,
        skip,
        take,
        orderBy: { ID: 'asc' },
      }),
      this.prisma.unit.count({ where }),
    ]);

    return {
      success: true,
      data: rows.map(mapUnit),
      total,
      page,
      limit: take,
      lastPage: Math.max(1, Math.ceil(total / take)),
    };
  }

  /** รายการ active ทั้งหมด (ไม่แบ่งหน้า) — ใช้ dropdown ในฟอร์ม item */
  async findAllActive() {
    const rows = await this.prisma.unit.findMany({
      where: { OR: [{ IsCancel: false }, { IsCancel: null }] },
      orderBy: { UnitName: 'asc' },
      select: { ID: true, UnitName: true },
    });
    return {
      success: true,
      data: rows.map((r) => ({
        id: r.ID,
        unitName: r.UnitName ?? '',
      })),
    };
  }

  async findOne(id: number) {
    const row = await this.prisma.unit.findUnique({ where: { ID: id } });
    if (!row) {
      throw new NotFoundException('ไม่พบหน่วยนับ');
    }
    return { success: true, data: mapUnit(row) };
  }

  async create(dto: CreateUnitDto) {
    const row = await this.prisma.unit.create({
      data: {
        UnitName: dto.UnitName.trim(),
        ...(dto.B_ID != null ? { B_ID: dto.B_ID } : {}),
        IsCancel: false,
      },
    });
    return { success: true, message: 'สร้างหน่วยนับสำเร็จ', data: mapUnit(row) };
  }

  async update(id: number, dto: UpdateUnitDto) {
    await this.ensureExists(id);
    const data: Prisma.UnitUpdateInput = {};
    if (dto.UnitName !== undefined) data.UnitName = dto.UnitName.trim();
    if (dto.B_ID !== undefined) data.B_ID = dto.B_ID;
    if (dto.IsCancel !== undefined) data.IsCancel = dto.IsCancel;
    const row = await this.prisma.unit.update({
      where: { ID: id },
      data,
    });
    return { success: true, message: 'อัปเดตหน่วยนับสำเร็จ', data: mapUnit(row) };
  }

  /** ยกเลิกใช้งาน (IsCancel) — ไม่ลบแถว */
  async softDelete(id: number) {
    await this.ensureExists(id);
    const row = await this.prisma.unit.update({
      where: { ID: id },
      data: { IsCancel: true },
    });
    return { success: true, message: 'ยกเลิกหน่วยนับแล้ว', data: mapUnit(row) };
  }

  private async ensureExists(id: number) {
    const row = await this.prisma.unit.findUnique({
      where: { ID: id },
      select: { ID: true },
    });
    if (!row) throw new NotFoundException('ไม่พบหน่วยนับ');
  }
}
