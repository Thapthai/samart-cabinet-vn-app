import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import {
  MedicalSupplyUsageController,
  MedicalSupplyItemController,
  MedicalSupplyController,
} from './medical-supplies.controller';
import { MedicalSuppliesService } from './medical-supplies.service';
import { FlexibleAuthGuard } from './guards/flexible-auth.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    AuthModule,
  ],
  controllers: [
    MedicalSupplyUsageController,
    MedicalSupplyItemController,
    MedicalSupplyController,
  ],
  providers: [MedicalSuppliesService, FlexibleAuthGuard],
  exports: [MedicalSuppliesService],
})
export class MedicalSuppliesModule {}
