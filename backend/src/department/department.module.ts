import { Module } from '@nestjs/common';
import { DepartmentController, CabinetController, CabinetDepartmentController } from './department.controller';
import { MedicalSupplySubDepartmentController } from './medical-supply-sub-department.controller';
import { DepartmentService } from './department.service';
import { MedicalSupplySubDepartmentService } from './medical-supply-sub-department.service';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [StaffModule],
  controllers: [
    DepartmentController,
    CabinetController,
    CabinetDepartmentController,
    MedicalSupplySubDepartmentController,
  ],
  providers: [DepartmentService, MedicalSupplySubDepartmentService],
  exports: [DepartmentService, MedicalSupplySubDepartmentService],
})
export class DepartmentModule {}
