import { Module } from '@nestjs/common';
import { ItemController, ItemStockController } from './item.controller';
import { ItemService } from './item.service';
import { UnitController } from './unit.controller';
import { UnitService } from './unit.service';

@Module({
  controllers: [ItemController, ItemStockController, UnitController],
  providers: [ItemService, UnitService],
  exports: [ItemService, UnitService],
})
export class ItemModule {}
