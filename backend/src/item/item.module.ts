import { Module } from '@nestjs/common';
import { ItemController, ItemStockController } from './item.controller';
import { ItemService } from './item.service';
import { ItemMasterUploadService } from './item-master-upload.service';
import { UnitController } from './unit.controller';
import { UnitService } from './unit.service';

@Module({
  controllers: [ItemController, ItemStockController, UnitController],
  providers: [ItemService, ItemMasterUploadService, UnitService],
  exports: [ItemService, ItemMasterUploadService, UnitService],
})
export class ItemModule {}
