import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { ItemModule } from '../item/item.module';
import { ClientCredentialStrategy } from '../auth/strategies/client-credential.strategy';
import { StaffService } from './staff.service';
import { StaffDepartmentScopeService } from './staff-department-scope.service';
import {
  StaffUsersController,
  StaffRolesController,
  StaffRolePermissionsController,
  StaffRolePermissionDepartmentsController,
} from './staff.controller';
import { StaffMeController } from './staff-me.controller';
import { StaffItemsController } from './staff-items.controller';
import { StaffItemStocksController } from './staff-item-stocks.controller';

@Module({
  imports: [
    PrismaModule,
    ItemModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [
    StaffUsersController,
    StaffRolesController,
    StaffRolePermissionsController,
    StaffRolePermissionDepartmentsController,
    StaffMeController,
    StaffItemsController,
    StaffItemStocksController,
  ],
  providers: [StaffService, ClientCredentialStrategy, StaffDepartmentScopeService],
  exports: [StaffService, StaffDepartmentScopeService],
})
export class StaffModule {}
