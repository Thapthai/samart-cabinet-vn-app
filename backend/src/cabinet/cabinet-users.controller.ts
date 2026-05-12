import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { CabinetUsersService } from './cabinet-users.service';
import { CreateCabinetUserDto, UpdateCabinetUserDto } from './dto/cabinet-user.dto';

/** ผู้ใช้ในตู้ — อยู่ภายใต้ CabinetModule เส้นทาง `cabinet/users` */
@Controller('cabinet/users')
export class CabinetUsersController {
  constructor(private readonly cabinetUsersService: CabinetUsersService) { }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.cabinetUsersService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      keyword: typeof keyword === 'string' && keyword.trim() ? keyword.trim() : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cabinetUsersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCabinetUserDto) {
    return this.cabinetUsersService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCabinetUserDto) {
    return this.cabinetUsersService.update(id, dto);
  }
}
