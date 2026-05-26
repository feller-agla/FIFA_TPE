import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { PricesService } from './prices.service';

@Controller('prices')
export class PricesController {
  constructor(private readonly prices: PricesService) {}

  @Get()
  findAll() {
    return this.prices.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { amount?: number }) {
    return this.prices.update(id, body);
  }
}
