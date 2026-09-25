import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { PosService, CheckoutDto } from './pos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Get('products')
  getProducts(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.posService.getProducts({ page, limit });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Post('products')
  addProduct(@Body() body: any) {
    return this.posService.addProduct(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() body: any) {
    return this.posService.updateProduct(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Delete('products/:id')
  deleteProduct(@Param('id') id: string) {
    return this.posService.deleteProduct(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Patch('products/:id/stock')
  updateStock(
    @Param('id') id: string,
    @Body('size') size: string,
    @Body('stock') stock: number,
  ) {
    return this.posService.updateStock(id, size, stock);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Get('orders')
  getOrders(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.posService.getOrders({ page, limit });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist', 'family', 'student')
  @Post('checkout')
  processCheckout(@Request() req: any, @Body() dto: CheckoutDto) {
    return this.posService.processCheckout(dto, req.user ?? undefined);
  }
}
