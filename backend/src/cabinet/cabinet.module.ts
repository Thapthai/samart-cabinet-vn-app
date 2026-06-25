import { Module } from '@nestjs/common';
import { CabinetUsersController } from './cabinet-users.controller';
import { CabinetUsersService } from './cabinet-users.service';
import { StaffModule } from '../staff/staff.module';

/** โมดูลตู้ — ปัจจุบันรวมเฉพาะผู้ใช้ในตู้ (legacy users / user_cabinet); CRUD ตู้หลักยังอยู่ department */
@Module({
  imports: [StaffModule],
  controllers: [CabinetUsersController],
  providers: [CabinetUsersService],
})
export class CabinetModule {}
