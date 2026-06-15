import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

/** Staff User (app_users) ที่ emp_code = Employee.EmpCode */
const linkedStaffUserSelect = {
  id: true,
  email: true,
  fname: true,
  lname: true,
  emp_code: true,
  is_active: true,
} as const;

type EmployeeWithLinks = {
  EmpCode: string;
  FirstName: string | null;
  LastName: string | null;
  IsUser: number | null;
  users?: Array<{
    id: number;
    email: string;
    fname: string;
    lname: string;
    emp_code: string | null;
    is_active: boolean;
  }>;
  _count?: { users: number; legacyUsers: number };
};

/** IsUser บนตาราง employee: 1 = ใช้งาน, 0 = ปิด (ค่า null ถือเป็น 1) */
function normalizeEmployeeIsUser(value: number | null | undefined): number {
  return value === 0 ? 0 : 1;
}

function mapEmployee(row: EmployeeWithLinks) {
  const fn = row.FirstName?.trim() ?? '';
  const ln = row.LastName?.trim() ?? '';
  const displayName = [fn, ln].filter(Boolean).join(' ') || null;

  /** User.emp_code ตรงกับ Employee.EmpCode (relation ใน Prisma) */
  const staffUser =
    row.users?.find((u) => u.emp_code != null && u.emp_code.trim() === row.EmpCode) ??
    row.users?.[0] ??
    null;

  const linkedStaffUser = staffUser
    ? {
        id: staffUser.id,
        email: staffUser.email,
        fullName: [staffUser.fname, staffUser.lname].filter(Boolean).join(' ').trim() || null,
        empCode: staffUser.emp_code,
        isActive: staffUser.is_active,
      }
    : null;

  const isUser = normalizeEmployeeIsUser(row.IsUser);

  return {
    empCode: row.EmpCode,
    firstName: row.FirstName,
    lastName: row.LastName,
    displayName,
    /** null = ไม่ผูก Staff User (app_users.emp_code) */
    linkedStaffUser,
    /** IsUser จากตาราง employee: 1 = ใช้งาน, 0 = ปิด */
    isUser,
    linkedUserCount: row._count?.users ?? (linkedStaffUser ? 1 : 0),
    linkedLegacyUserCount: row._count?.legacyUsers ?? 0,
  };
}

const employeeIncludeLinks = {
  users: {
    where: { emp_code: { not: null } },
    select: linkedStaffUserSelect,
    take: 1,
  },
  _count: { select: { users: true, legacyUsers: true } },
} as const;

@Injectable()
export class EmpolyeeService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(page = 1, limit = 20, keyword?: string) {
    const take = Math.min(100, Math.max(1, limit));
    const skip = (page - 1) * take;

    const parts: Prisma.EmployeeWhereInput[] = [];
    const kw = keyword?.trim();
    if (kw) {
      parts.push({
        OR: [
          { EmpCode: { contains: kw } },
          { FirstName: { contains: kw } },
          { LastName: { contains: kw } },
        ],
      });
    }
    const where: Prisma.EmployeeWhereInput = parts.length ? { AND: parts } : {};

    const [rows, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take,
        orderBy: { EmpCode: 'asc' },
        include: employeeIncludeLinks,
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      success: true,
      data: rows.map(mapEmployee),
      total,
      page,
      limit: take,
      lastPage: Math.max(1, Math.ceil(total / take)),
    };
  }

  async findOne(empCode: string) {
    const code = empCode.trim();
    const row = await this.prisma.employee.findUnique({
      where: { EmpCode: code },
      include: employeeIncludeLinks,
    });
    if (!row) throw new NotFoundException(`ไม่พบพนักงาน EmpCode ${code}`);
    return { success: true, data: mapEmployee(row) };
  }

  async create(dto: CreateEmployeeDto) {
    const empCode = dto.EmpCode.trim();
    if (!empCode) throw new BadRequestException('กรุณาระบุ EmpCode');

    const existing = await this.prisma.employee.findUnique({
      where: { EmpCode: empCode },
      select: { EmpCode: true },
    });
    if (existing) throw new BadRequestException(`EmpCode "${empCode}" มีอยู่แล้ว`);

    const isUser = dto.IsUser !== undefined ? normalizeEmployeeIsUser(dto.IsUser) : 1;

    const row = await this.prisma.employee.create({
      data: {
        EmpCode: empCode,
        FirstName: dto.FirstName?.trim() || null,
        LastName: dto.LastName?.trim() || null,
        IsUser: isUser,
      },
      include: employeeIncludeLinks,
    });

    return {
      success: true,
      data: mapEmployee(row),
      message: 'เพิ่มพนักงานแล้ว',
    };
  }

  async update(empCode: string, dto: UpdateEmployeeDto) {
    const code = empCode.trim();
    const existing = await this.prisma.employee.findUnique({
      where: { EmpCode: code },
      select: { EmpCode: true },
    });
    if (!existing) throw new NotFoundException(`ไม่พบพนักงาน EmpCode ${code}`);

    const employeePatch: Prisma.EmployeeUpdateInput = {};
    if (dto.FirstName !== undefined) {
      employeePatch.FirstName = dto.FirstName.trim() || null;
    }
    if (dto.LastName !== undefined) {
      employeePatch.LastName = dto.LastName.trim() || null;
    }
    if (dto.IsUser !== undefined) {
      employeePatch.IsUser = dto.IsUser;
    }

    let targetCode = code;
    const requestedEmpCode = dto.EmpCode?.trim();
    if (requestedEmpCode !== undefined && requestedEmpCode !== code) {
      if (!requestedEmpCode) {
        throw new BadRequestException('กรุณาระบุ EmpCode');
      }
      const duplicate = await this.prisma.employee.findUnique({
        where: { EmpCode: requestedEmpCode },
        select: { EmpCode: true },
      });
      if (duplicate) {
        throw new BadRequestException(`EmpCode "${requestedEmpCode}" มีอยู่แล้ว`);
      }

      await this.prisma.$transaction(async (tx) => {
        const linkedStaff = await tx.user.findMany({
          where: { emp_code: code },
          select: { id: true },
        });
        const linkedLegacy = await tx.legacyUsers.findMany({
          where: { EmpCode: code },
          select: { id: true },
        });

        if (linkedStaff.length > 0) {
          await tx.user.updateMany({
            where: { emp_code: code },
            data: { emp_code: null },
          });
        }
        if (linkedLegacy.length > 0) {
          await tx.legacyUsers.updateMany({
            where: { EmpCode: code },
            data: { EmpCode: null },
          });
        }

        await tx.employee.update({
          where: { EmpCode: code },
          data: {
            EmpCode: requestedEmpCode,
            ...employeePatch,
          },
        });

        for (const staff of linkedStaff) {
          await tx.user.update({
            where: { id: staff.id },
            data: { emp_code: requestedEmpCode },
          });
        }
        for (const legacy of linkedLegacy) {
          await tx.legacyUsers.update({
            where: { id: legacy.id },
            data: { EmpCode: requestedEmpCode },
          });
        }
      });

      targetCode = requestedEmpCode;
    } else if (Object.keys(employeePatch).length > 0) {
      await this.prisma.employee.update({
        where: { EmpCode: code },
        data: employeePatch,
      });
    }

    if (dto.IsUser !== undefined) {
      const isActive = dto.IsUser === 1;
      const staff = await this.prisma.user.findFirst({
        where: { emp_code: targetCode, is_admin: false },
        select: { id: true },
      });
      if (staff) {
        await this.prisma.user.update({
          where: { id: staff.id },
          data: { is_active: isActive },
        });
      }
    }

    const row = await this.prisma.employee.findUniqueOrThrow({
      where: { EmpCode: targetCode },
      include: employeeIncludeLinks,
    });

    return {
      success: true,
      data: mapEmployee(row),
      message: 'บันทึกแล้ว',
    };
  }

  async remove(empCode: string) {
    const code = empCode.trim();
    const existing = await this.prisma.employee.findUnique({
      where: { EmpCode: code },
      include: employeeIncludeLinks,
    });
    if (!existing) throw new NotFoundException(`ไม่พบพนักงาน EmpCode ${code}`);

    const mapped = mapEmployee(existing);
    const linked = (mapped.linkedUserCount ?? 0) + (mapped.linkedLegacyUserCount ?? 0);
    if (linked > 0) {
      throw new BadRequestException(
        `ไม่สามารถลบได้ — EmpCode นี้ถูกผูกกับบัญชีในระบบแล้ว (${linked} รายการ)`,
      );
    }

    await this.prisma.employee.delete({ where: { EmpCode: code } });
    return { success: true, message: 'ลบพนักงานแล้ว' };
  }
}
