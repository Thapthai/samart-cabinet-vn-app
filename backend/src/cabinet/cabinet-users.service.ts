import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCabinetUserDto, UpdateCabinetUserDto } from './dto/cabinet-user.dto';

/** ข้อมูลตู้จาก app_cabinets ที่ใช้ตอบ API */
type CabinetSummary = {
  id: number;
  cabinet_name: string | null;
  cabinet_code: string | null;
  stock_id: number | null;
};

@Injectable()
export class CabinetUsersService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * user_cabinet.cabinet_id (ใน Prisma) = app_cabinets.stock_id — ไม่ใช่ app_cabinets.id
   * @map ชื่อคอลัมน์จริงใน DB ดูใน schema.prisma
   */
  private async cabinetsByStockIds(stockIds: number[]): Promise<Map<number, CabinetSummary>> {
    const unique = [...new Set(stockIds.filter((n) => Number.isFinite(n)))];
    if (unique.length === 0) return new Map();
    const rows = await this.prisma.cabinet.findMany({
      where: { stock_id: { in: unique } },
      select: {
        id: true,
        cabinet_name: true,
        cabinet_code: true,
        stock_id: true,
      },
    });
    const map = new Map<number, CabinetSummary>();
    for (const c of rows) {
      if (c.stock_id != null) map.set(c.stock_id, c);
    }
    return map;
  }

  async findAll(params?: { page?: number; limit?: number; keyword?: string }) {
    const page = Math.max(1, params?.page ?? 1);
    const limit = Math.min(100, Math.max(1, params?.limit ?? 20));
    const skip = (page - 1) * limit;
    const kw = params?.keyword?.trim();
    const where: {
      OR?: Array<{ UserName?: { contains: string }; EmpCode?: { contains: string } }>;
    } = {};
    if (kw) {
      where.OR = [{ UserName: { contains: kw } }, { EmpCode: { contains: kw } }];
    }
    const [rows, total] = await Promise.all([
      this.prisma.legacyUsers.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'asc' },
        include: {
          employee: { select: { EmpCode: true, FirstName: true, LastName: true } },
        },
      }),
      this.prisma.legacyUsers.count({ where }),
    ]);

    const legacyIds = rows.map((r) => r.id);
    const allUserCabinetRows =
      legacyIds.length > 0
        ? await this.prisma.userCabinet.findMany({
          where: { user_id: { in: legacyIds } },
          select: {
            id: true,
            user_id: true,
            cabinet_id: true,
          },
        })
        : [];
    const userCabinetByLegacyId = new Map<number, typeof allUserCabinetRows>();
    for (const uc of allUserCabinetRows) {
      const list = userCabinetByLegacyId.get(uc.user_id) ?? [];
      list.push(uc);
      userCabinetByLegacyId.set(uc.user_id, list);
    }

    const allFingerStockIds = [
      ...new Set(allUserCabinetRows.map((c) => c.cabinet_id)),
    ];
    const cabinetByStock = await this.cabinetsByStockIds(allFingerStockIds);

    const data = rows.map((u) => {
      const userCabinet = userCabinetByLegacyId.get(u.id) ?? [];
      const fn = u.employee?.FirstName?.trim() ?? '';
      const ln = u.employee?.LastName?.trim() ?? '';
      const employee_display = [fn, ln].filter(Boolean).join(' ') || null;
      const linked_cabinets = userCabinet.map((uc) => {
        const sid = uc.cabinet_id;
        const cab = cabinetByStock.get(sid) ?? null;
        return {
          user_cabinet_id: uc.id,
          user_id: uc.user_id,
          /** เท่ากับ app_cabinets.stock_id */
          cabinet_id: sid,
          cabinet: cab,
        };
      });
      return {
        id: u.id,
        userName: u.UserName,
        empCode: u.EmpCode,
        employee_display,
        employee: u.employee
          ? {
            empCode: u.employee.EmpCode,
            firstName: u.employee.FirstName,
            lastName: u.employee.LastName,
          }
          : null,
        linked_cabinets,
        cabinet_count: userCabinet.length,
      };
    });
    return {
      success: true,
      data,
      total,
      page,
      limit,
      lastPage: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: number) {
    const u = await this.prisma.legacyUsers.findUnique({
      where: { id },
      include: {
        employee: { select: { EmpCode: true, FirstName: true, LastName: true } },
      },
    });
    if (!u) throw new NotFoundException('ไม่พบผู้ใช้ตู้');

    const userCabinet = await this.prisma.userCabinet.findMany({
      where: { user_id: id },
      select: {
        id: true,
        user_id: true,
        cabinet_id: true,
      },
    });

    const fingerStockIds = userCabinet.map((x) => x.cabinet_id);
    const cabinetByStock = await this.cabinetsByStockIds(fingerStockIds);

    const linked_cabinets = userCabinet.map((uc) => {
      const sid = uc.cabinet_id;
      const cab = cabinetByStock.get(sid) ?? null;
      return {
        user_cabinet_id: uc.id,
        user_id: uc.user_id,
        cabinet_id: sid,
        cabinet: cab,
      };
    });

    /** app_cabinets.id ตามลำดับแถว user_cabinet — ใช้ติ๊กในฟอร์ม (ตู้ที่ resolve ได้จาก stock_id เท่านั้น) */
    const cabinet_ids: number[] = [];
    const seenCabinetPk = new Set<number>();
    for (const link of linked_cabinets) {
      if (link.cabinet && !seenCabinetPk.has(link.cabinet.id)) {
        seenCabinetPk.add(link.cabinet.id);
        cabinet_ids.push(link.cabinet.id);
      }
    }

    const resolved_cabinets: CabinetSummary[] = [];
    const seenRes = new Set<number>();
    for (const link of linked_cabinets) {
      const c = link.cabinet;
      if (c && !seenRes.has(c.id)) {
        seenRes.add(c.id);
        resolved_cabinets.push(c);
      }
    }

    const fn = u.employee?.FirstName?.trim() ?? '';
    const ln = u.employee?.LastName?.trim() ?? '';
    return {
      success: true,
      data: {
        id: u.id,
        userName: u.UserName,
        empCode: u.EmpCode,
        employee_display: [fn, ln].filter(Boolean).join(' ') || null,
        employee: u.employee
          ? {
            empCode: u.employee.EmpCode,
            firstName: u.employee.FirstName,
            lastName: u.employee.LastName,
          }
          : null,
        hasPassword: !!(u.Password && String(u.Password).length > 0),
        userCabinet,
        linked_cabinets,
        resolved_cabinets,
        cabinet_ids,
      },
    };
  }

  async create(dto: CreateCabinetUserDto) {
    const userName = dto.user_name?.trim();
    if (!userName) throw new BadRequestException('กรุณากรอกชื่อ (UserName)');

    const empCode = dto.emp_code?.trim() || null;
    if (empCode) {
      await this.assertEmployeeExists(empCode);
      const taken = await this.prisma.legacyUsers.findFirst({ where: { EmpCode: empCode } });
      if (taken) {
        throw new BadRequestException('รหัสพนักงานนี้มีผู้ใช้ตู้อยู่แล้ว — ใช้แก้ไขแทนการสร้างใหม่');
      }
    }

    const pwd = dto.password?.trim() ? dto.password.trim().slice(0, 20) : null;

    const user = await this.prisma.legacyUsers.create({
      data: {
        UserName: userName,
        EmpCode: empCode,
        Password: pwd,
      },
    });

    const warnings = await this.syncCabinets(user.id, dto.cabinet_ids ?? []);
    return {
      success: true,
      message: 'สร้างผู้ใช้ตู้แล้ว',
      data: { id: user.id },
      warnings: warnings.length ? warnings : undefined,
    };
  }

  /**
   * ซิงก์ `user_cabinet` เท่านั้น — ไม่อัปเดตตาราง `users` (UserName / EmpCode / Password)
   */
  async update(id: number, dto: UpdateCabinetUserDto) {
    const legacyUser = await this.prisma.legacyUsers.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!legacyUser) throw new NotFoundException('ไม่พบผู้ใช้ตู้');

    const legacyUserId = legacyUser.id;

    let warnings: string[] | undefined;
    if (dto.cabinet_ids !== undefined) {
      warnings = await this.syncCabinets(legacyUserId, dto.cabinet_ids);
      if (warnings.length === 0) warnings = undefined;
    }

    return {
      success: true,
      message: 'บันทึกแล้ว',
      warnings,
    };
  }

  private async assertEmployeeExists(empCode: string) {
    const e = await this.prisma.employee.findUnique({ where: { EmpCode: empCode } });
    if (!e) throw new BadRequestException(`ไม่พบพนักงาน EmpCode ${empCode}`);
  }

  /**
   * ซิงก์เฉพาะแถวของผู้ใช้ตู้คนนี้ (user_id = legacy user):
   * ลบเฉพาะผูกของคนนี้ที่ไม่อยู่ในรายการใหม่ — ไม่แก้/ไม่ลบแถวของผู้ใช้ตู้คนอื่น
   * แต่ละ stock_id: ไม่มีแถว → create ให้คนนี้; เป็นของคนนี้แล้ว → ข้าม; เป็นของคนอื่น → warning (ไม่ย้าย user_id)
   */
  private async syncCabinets(legacyUserId: number, cabinetIds: number[]): Promise<string[]> {
    const warnings: string[] = [];
    const rawList = Array.isArray(cabinetIds) ? cabinetIds : [];
    const ids = [
      ...new Set(
        rawList
          .map((raw) => {
            if (raw == null) return NaN;
            return typeof raw === 'number' ? raw : Number.parseInt(String(raw).trim(), 10);
          })
          .filter((n) => Number.isFinite(n) && n > 0),
      ),
    ];
    /** ส่งมาว่าไม่ว่างแต่ parse ไม่ได้ — อย่าถือว่าเป็น “ล้างทั้งหมด” (เดิมจะได้ ids=[] แล้วไปลบผูกครบ) */
    if (rawList.length > 0 && ids.length === 0) {
      throw new BadRequestException('รูปแบบ cabinet_ids ไม่ถูกต้อง (ต้องเป็นเลข id ตู้)');
    }

    const cabinets =
      ids.length > 0
        ? await this.prisma.cabinet.findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            cabinet_name: true,
            cabinet_code: true,
            stock_id: true,
          },
        })
        : [];

    for (const cid of ids) {
      const c = cabinets.find((x) => x.id === cid);

      if (!c) warnings.push(`ไม่พบตู้ id ${cid}`);
      else if (c.stock_id == null) {
        warnings.push(
          `ตู้ "${c.cabinet_name ?? c.cabinet_code ?? cid}" ยังไม่มี stock_id — ตั้ง stock_id ในจัดการตู้ก่อน (ใช้เป็นตัวเชื่อมกับตู้จริง)`,
        );
      }
    }

    const desiredStockIds = [...new Set(cabinets.filter((c) => c.stock_id != null).map((c) => c.stock_id!))];
    const uid = Number.parseInt(String(legacyUserId), 10);
    if (!Number.isSafeInteger(uid) || uid < 1) {
      throw new BadRequestException('รหัสผู้ใช้ตู้ไม่ถูกต้อง');
    }

    await this.prisma.$transaction(async (tx) => {
      /**
       * ล้างผูกทั้งหมดเฉพาะเมื่อส่งมาว่างจริงๆ — ถ้าเลือกตู้แต่ไม่มี stock_id เลย อย่าลบของเดิมทั้งหมด
       */
 
      if (desiredStockIds.length === 0) {
        if (ids.length === 0) {
          await tx.userCabinet.deleteMany({ where: { user_id: uid } });
        }
        return;
      }

      /** ถอดเฉพาะผูกของ user คนนี้ที่ไม่อยู่ในรายการใหม่ — ไม่แตะแถวของ user_id อื่น */

      await tx.userCabinet.deleteMany({
        where: {
          user_id: uid,
          cabinet_id: { notIn: desiredStockIds },
        },
      });

 
      /**
       * cabinet_id = stock_id unique ทั้งระบบ — create ได้เมื่อยังไม่มีแถว;
       * ถ้ามีของผู้ใช้อื่นอยู่แล้วไม่ย้าย user_id (กันผู้ใช้อื่นถูกถอดตู้โดยไม่เกี่ยวข้อง)
       */
      for (const fid of desiredStockIds) {
        const existingMine = await tx.userCabinet.findFirst({
          where: { user_id: uid, cabinet_id: fid },
          select: { id: true },
        });
      
        if (existingMine) {
          continue;
        }

        const row = await tx.userCabinet.findUnique({
          where: { cabinet_id: fid ,user_id: uid},
          select: { user_id: true },
        });
 
        if (row == null) {
          await tx.userCabinet.create({
            data: { user_id: uid, cabinet_id: fid },
          });
          continue;
        }

        warnings.push(
          `ไม่ผูก stock_id ${fid} — มีผู้ใช้ตู้ (users.ID=${row.user_id}) ใช้อยู่แล้ว`,
        );
      }
    });

    return warnings;
  }
}
