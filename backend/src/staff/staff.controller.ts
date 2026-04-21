import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { AuthService } from '../auth/auth.service';
import {
  CreateStaffUserDto,
  UpdateStaffUserDto,
  RegenerateClientSecretDto,
  StaffLoginDto,
} from '../auth/dto/staff-user.dto';
import { CreateStaffRoleDto, UpdateStaffRoleDto } from '../auth/dto/staff-role.dto';
import { BulkUpdateStaffRolePermissionsDto } from '../auth/dto/staff-role-permission.dto';
import { SetStaffRolePermissionDepartmentsDto } from '../auth/dto/staff-role-permission-department.dto';

@Controller('staff-users')
export class StaffUsersController {
  constructor(
    private readonly staffService: StaffService,
    private readonly authService: AuthService,
  ) {}

  /** รองรับ client เดิม — delegate ไปยัง /auth/login (ตาราง User เดียว) */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: StaffLoginDto) {
    return this.authService.login({ email: dto.email, password: dto.password });
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('keyword') keyword?: string,
  ) {
    const params = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      keyword: keyword?.trim() || undefined,
    };
    return this.staffService.findAllStaffUsers(params);
  }

  /** รายชื่อพนักงานจาก HR สำหรับเลือกผูก emp_code (ต้องอยู่ก่อน @Get(':id')) */
  @Get('employees')
  async listEmployees(
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('exclude_linked') exclude_linked?: string,
    @Query('except_user_id') except_user_id?: string,
  ) {
    const exceptId =
      except_user_id != null && except_user_id !== '' && !Number.isNaN(parseInt(except_user_id, 10))
        ? parseInt(except_user_id, 10)
        : undefined;
    const exclude =
      exclude_linked === '0' || exclude_linked === 'false' ? false : true;
    return this.staffService.findEmployeesForPicker({
      keyword: keyword?.trim() || undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      exclude_linked: exclude,
      except_user_id: exceptId,
    });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.staffService.findOneStaffUser(id);
  }

  @Post()
  async create(@Body() dto: CreateStaffUserDto) {
    try {
      return await this.staffService.createStaffUser(dto);
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      const message = err?.message ?? String(err);
      if (err?.code === 'P2003') throw new BadRequestException('Department or role not found. Please check department_id and role.');
      throw new BadRequestException(message || 'Failed to create staff user');
    }
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStaffUserDto,
  ) {
    return this.staffService.updateStaffUser(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.staffService.deleteStaffUser(id);
  }

  @Post(':id/regenerate-secret')
  async regenerateSecret(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegenerateClientSecretDto,
  ) {
    return this.staffService.regenerateClientSecret(id, dto);
  }
}

@Controller('staff-roles')
export class StaffRolesController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  async findAll() {
    return this.staffService.findAllStaffRoles();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.staffService.findOneStaffRole(id);
  }

  @Post()
  async create(@Body() dto: CreateStaffRoleDto) {
    return this.staffService.createStaffRole(dto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStaffRoleDto,
  ) {
    return this.staffService.updateStaffRole(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.staffService.deleteStaffRole(id);
  }
}

@Controller('staff-role-permissions')
export class StaffRolePermissionsController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  async findAll() {
    return this.staffService.findAllStaffRolePermissions();
  }

  @Get(':role')
  async getByRole(@Param('role') role: string) {
    return this.staffService.findPermissionsByRoleCode(role);
  }

  @Put('bulk')
  async bulkUpdate(@Body() dto: BulkUpdateStaffRolePermissionsDto) {
    const list = (dto.permissions ?? []).map((p) => ({
      role_code: p.role_code,
      role_id: p.role_id,
      menu_href: p.menu_href,
      can_access: p.can_access ?? true,
    }));
    return this.staffService.bulkUpdateStaffRolePermissions(list);
  }
}

/** จำกัดแผนกหลักต่อ StaffRole — ไม่มีแถว = ไม่จำกัด */
@Controller('staff-role-permission-departments')
export class StaffRolePermissionDepartmentsController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  async find(
    @Query('role_id') roleIdStr?: string,
    @Query('role_code') role_code?: string,
  ) {
    const role_id =
      roleIdStr != null && roleIdStr !== '' && !Number.isNaN(parseInt(roleIdStr, 10))
        ? parseInt(roleIdStr, 10)
        : undefined;
    return this.staffService.findStaffRolePermissionDepartments(role_code, role_id);
  }

  @Put()
  async set(@Body() dto: SetStaffRolePermissionDepartmentsDto) {
    return this.staffService.setStaffRolePermissionDepartments(dto);
  }
}
