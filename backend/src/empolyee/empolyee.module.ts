import { Module } from '@nestjs/common';
import { EmpolyeeController } from './empolyee.controller';
import { EmpolyeeService } from './empolyee.service';

@Module({
  controllers: [EmpolyeeController],
  providers: [EmpolyeeService],
  exports: [EmpolyeeService],
})
export class EmpolyeeModule { }
