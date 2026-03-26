import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { ClientCredentialStrategy } from '../auth/strategies/client-credential.strategy';
import {
  CreateStaffUserDto,
  UpdateStaffUserDto,
  RegenerateClientSecretDto,
} from '../auth/dto/staff-user.dto';
import { CreateStaffRoleDto, UpdateStaffRoleDto } from '../auth/dto/staff-role.dto';

/** เมนูเริ่มต้นหลังสร้าง role — บันทึกใน app_microservice_staff_role_permissions */
const STAFF_ENTRY_MENU_HREF = '/staff/dashboard';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientCredentialStrategy: ClientCredentialStrategy,
    private readonly jwt: JwtService,
  ) {}

  private async resolveRoleId(role_code?: string, role_id?: number): Promise<number | null> {
    if (role_id != null) return role_id;
    if (!role_code?.trim()) return null;
    const role = await this.prisma.staffRole.findUnique({
      where: { code: role_code.trim() },
      select: { id: true },
    });
    return role?.id ?? null;
  }

  async loginStaffUser(email: string, password: string) {
    const staff = await this.prisma.staffUser.findUnique({
      where: { email: email.trim() },
      include: { role: { select: { id: true, code: true, name: true } } },
    });
    if (!staff) return { success: false, message: 'Invalid credentials' };
    if (!staff.is_active) return { success: false, message: 'Account is deactivated' };
    const valid = await bcrypt.compare(password, staff.password);
    if (!valid) return { success: false, message: 'Invalid credentials' };
    const token = this.jwt.sign(
      { sub: staff.id, email: staff.email, staff: true, role_code: staff.role?.code },
      { expiresIn: '24h' },
    );
    return {
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: staff.id,
          email: staff.email,
          fname: staff.fname,
          lname: staff.lname,
          role: staff.role?.code ?? null,
          role_id: staff.role_id,
          department_id: staff.department_id,
        },
        token,
      },
    };
  }

  async findAllStaffUsers(params?: { page?: number; limit?: number; keyword?: string }) {
    const page = Math.max(1, params?.page ?? 1);
    const limit = Math.min(100, Math.max(1, params?.limit ?? 50));
    const skip = (page - 1) * limit;
    const where: any = {};
    if (params?.keyword?.trim()) {
      const k = params.keyword.trim();
      where.OR = [
        { email: { contains: k } },
        { fname: { contains: k } },
        { lname: { contains: k } },
        { client_id: { contains: k } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.staffUser.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'asc' },
        include: {
          role: { select: { id: true, code: true, name: true } },
          department: { select: { ID: true, DepName: true, DepName2: true } },
        },
      }),
      this.prisma.staffUser.count({ where }),
    ]);
    const list = data.map((u) => ({
      id: u.id,
      email: u.email,
      fname: u.fname,
      lname: u.lname,
      role: u.role?.code ?? null,
      role_id: u.role_id,
      department_id: u.department_id,
      department_name: u.department?.DepName ?? u.department?.DepName2 ?? null,
      client_id: u.client_id,
      expires_at: u.expires_at?.toISOString?.() ?? null,
      is_active: u.is_active,
      created_at: u.created_at?.toISOString?.() ?? null,
      updated_at: u.updated_at?.toISOString?.() ?? null,
    }));
    return { success: true, data: list, total, page, limit, lastPage: Math.ceil(total / limit) };
  }

  async createStaffUser(dto: CreateStaffUserDto) {
    const existing = await this.prisma.staffUser.findUnique({ where: { email: dto.email.trim() } });
    if (existing) throw new BadRequestException('Email already exists');

    const roleId = await this.resolveRoleId(dto.role_code, dto.role_id);
    if (roleId == null) throw new BadRequestException('role_code or role_id is required and must match an existing role');

    const departmentId = dto.department_id ?? null;
    if (departmentId != null) {
      const dept = await this.prisma.department.findUnique({ where: { ID: departmentId }, select: { ID: true } });
      if (!dept) throw new BadRequestException(`Department with ID ${departmentId} not found`);
    }

    const password = dto.password?.trim() && dto.password.length >= 8
      ? await bcrypt.hash(dto.password, 10)
      : await bcrypt.hash('password123', 10);

    const { client_id, client_secret, client_secret_hash } = this.clientCredentialStrategy.generateClientCredential();

    const expiresAt = dto.expires_at?.trim()
      ? new Date(dto.expires_at)
      : null;

    const user = await this.prisma.staffUser.create({
      data: {
        email: dto.email.trim(),
        fname: dto.fname.trim(),
        lname: dto.lname.trim(),
        role_id: roleId,
        department_id: departmentId,
        password,
        client_id,
        client_secret: client_secret_hash,
        expires_at: expiresAt,
        is_active: dto.is_active ?? true,
      },
    });
    return {
      success: true,
      message: 'Staff user created',
      data: {
        id: user.id,
        email: user.email,
        fname: user.fname,
        lname: user.lname,
        client_id,
        client_secret,
      },
    };
  }

  async findOneStaffUser(id: number) {
    const user = await this.prisma.staffUser.findUnique({
      where: { id },
      include: {
        role: { select: { id: true, code: true, name: true } },
        department: { select: { ID: true, DepName: true, DepName2: true } },
      },
    });
    if (!user) throw new NotFoundException('Staff user not found');
    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fname: user.fname,
        lname: user.lname,
        role: user.role?.code ?? null,
        department_id: user.department_id,
        department_name: user.department?.DepName ?? user.department?.DepName2 ?? null,
        client_id: user.client_id,
        expires_at: user.expires_at?.toISOString?.() ?? null,
        is_active: user.is_active,
        created_at: user.created_at?.toISOString?.() ?? null,
        updated_at: user.updated_at?.toISOString?.() ?? null,
      },
    };
  }

  async updateStaffUser(id: number, dto: UpdateStaffUserDto) {
    const user = await this.prisma.staffUser.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Staff user not found');

    const data: any = {};
    if (dto.email !== undefined) data.email = dto.email.trim();
    if (dto.fname !== undefined) data.fname = dto.fname.trim();
    if (dto.lname !== undefined) data.lname = dto.lname.trim();
    if (dto.department_id !== undefined) data.department_id = dto.department_id;
    if (dto.is_active !== undefined) data.is_active = dto.is_active;
    if (dto.expires_at !== undefined) data.expires_at = dto.expires_at?.trim() ? new Date(dto.expires_at) : null;

    const roleId = await this.resolveRoleId(dto.role_code, dto.role_id);
    if (roleId != null) data.role_id = roleId;

    if (dto.password?.trim() && dto.password.length >= 8) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    await this.prisma.staffUser.update({ where: { id }, data });
    return { success: true, message: 'Staff user updated' };
  }

  async deleteStaffUser(id: number) {
    const user = await this.prisma.staffUser.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Staff user not found');
    await this.prisma.staffUser.delete({ where: { id } });
    return { success: true, message: 'Staff user deleted' };
  }

  async regenerateClientSecret(id: number, dto?: RegenerateClientSecretDto) {
    const user = await this.prisma.staffUser.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Staff user not found');

    const { client_id, client_secret, client_secret_hash } = this.clientCredentialStrategy.generateClientCredential();
    const expiresAt = dto?.expires_at?.trim() ? new Date(dto.expires_at) : user.expires_at;

    await this.prisma.staffUser.update({
      where: { id },
      data: { client_secret: client_secret_hash, client_id, expires_at: expiresAt },
    });
    return {
      success: true,
      message: 'Client secret regenerated',
      data: { client_id, client_secret },
    };
  }

  async findAllStaffRoles() {
    const list = await this.prisma.staffRole.findMany({
      orderBy: { code: 'asc' },
    });
    return { success: true, data: list };
  }

  async findOneStaffRole(id: number) {
    const role = await this.prisma.staffRole.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Staff role not found');
    return { success: true, data: role };
  }

  async createStaffRole(dto: CreateStaffRoleDto) {
    const existing = await this.prisma.staffRole.findUnique({ where: { code: dto.code.trim() } });
    if (existing) throw new BadRequestException('Role code already exists');
    const role = await this.prisma.staffRole.create({
      data: {
        code: dto.code.trim(),
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        is_active: dto.is_active ?? true,
      },
    });
    await this.prisma.staffRolePermission.upsert({
      where: {
        role_menu_href: { role_id: role.id, menu_href: STAFF_ENTRY_MENU_HREF },
      },
      create: {
        role_id: role.id,
        menu_href: STAFF_ENTRY_MENU_HREF,
        can_access: true,
      },
      update: { can_access: true },
    });
    return { success: true, message: 'Role created', data: role };
  }

  async updateStaffRole(id: number, dto: UpdateStaffRoleDto) {
    const role = await this.prisma.staffRole.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Staff role not found');
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() ?? null;
    if (dto.is_active !== undefined) data.is_active = dto.is_active;
    await this.prisma.staffRole.update({ where: { id }, data });
    return { success: true, message: 'Role updated' };
  }

  async deleteStaffRole(id: number) {
    const role = await this.prisma.staffRole.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Staff role not found');
    await this.prisma.staffRole.delete({ where: { id } });
    return { success: true, message: 'Role deleted' };
  }

  async findAllStaffRolePermissions() {
    const list = await this.prisma.staffRolePermission.findMany({
      orderBy: [{ role_id: 'asc' }, { menu_href: 'asc' }],
      include: {
        role: { select: { id: true, code: true, name: true } },
      },
    });
    const data = list.map((p) => ({
      id: p.id,
      role_id: p.role_id,
      role_code: p.role?.code ?? null,
      menu_href: p.menu_href,
      can_access: p.can_access,
      created_at: p.created_at?.toISOString?.() ?? null,
      updated_at: p.updated_at?.toISOString?.() ?? null,
      role: p.role ? { code: p.role.code, name: p.role.name } : null,
    }));
    return { success: true, data };
  }

  async findPermissionsByRoleCode(roleCode: string) {
    const role = await this.prisma.staffRole.findUnique({
      where: { code: roleCode.trim() },
      select: { id: true },
    });
    if (!role) return { success: true, data: [] };
    const list = await this.prisma.staffRolePermission.findMany({
      where: { role_id: role.id },
      orderBy: { menu_href: 'asc' },
      select: { menu_href: true, can_access: true },
    });
    return { success: true, data: list };
  }

  async bulkUpdateStaffRolePermissions(
    permissions: Array<{ role_code?: string; role_id?: number; menu_href: string; can_access: boolean }>,
  ) {
    let updated = 0;
    for (const p of permissions) {
      const roleId = await this.resolveRoleId(p.role_code, p.role_id);
      if (roleId == null || !p.menu_href?.trim()) continue;
      const menu_href = p.menu_href.trim();
      await this.prisma.staffRolePermission.upsert({
        where: {
          role_menu_href: { role_id: roleId, menu_href },
        },
        create: { role_id: roleId, menu_href, can_access: p.can_access ?? true },
        update: { can_access: p.can_access ?? true },
      });
      updated++;
    }
    return { success: true, message: 'Permissions updated', updatedCount: updated };
  }
}
