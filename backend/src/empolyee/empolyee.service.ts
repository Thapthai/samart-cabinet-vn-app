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

  return {
    empCode: row.EmpCode,
    firstName: row.FirstName,
    lastName: row.LastName,
    displayName,
    /** null = ไม่ผูก Staff User (app_users.emp_code) */
    linkedStaffUser,
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

    const row = await this.prisma.employee.create({
      data: {
        EmpCode: empCode,
        FirstName: dto.FirstName?.trim() || null,
        LastName: dto.LastName?.trim() || null,
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

    const row = await this.prisma.employee.update({
      where: { EmpCode: code },
      data: {
        ...(dto.FirstName !== undefined ? { FirstName: dto.FirstName.trim() || null } : {}),
        ...(dto.LastName !== undefined ? { LastName: dto.LastName.trim() || null } : {}),
      },
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
