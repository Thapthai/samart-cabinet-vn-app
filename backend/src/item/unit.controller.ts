import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { UnitService } from './unit.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Controller('units')
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  @Get('active')
  async listActive() {
    return this.unitService.findAllActive();
  }

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('keyword') keyword?: string,
    @Query('include_cancelled') include_cancelled?: string,
    @Query('only_cancelled') only_cancelled?: string,
  ) {
    const onlyCancelled =
      only_cancelled === '1' || only_cancelled === 'true';
    const includeCancelled =
      include_cancelled === '1' || include_cancelled === 'true';
    return this.unitService.findAll(
      page,
      limit,
      keyword,
      includeCancelled,
      onlyCancelled,
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.unitService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateUnitDto) {
    return this.unitService.create(dto);
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUnitDto) {
    return this.unitService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.unitService.softDelete(id);
  }
}
