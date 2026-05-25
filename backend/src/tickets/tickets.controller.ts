import { Body, Controller, Get, Post } from '@nestjs/common';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  findAll() {
    return this.tickets.findAll();
  }

  @Post()
  create(
    @Body()
    body: {
      reference?: string;
      deviceId?: string;
      agentId?: number;
      sessionToken?: string;
      serviceType?: string;
      route?: string;
      amount?: number;
      paymentMode?: string;
      passengerName?: string;
      passengerPhone?: string;
      packageDetails?: string;
      receiverName?: string;
      receiverPhone?: string;
      ticketText?: string;
    },
  ) {
    return this.tickets.create(body);
  }
}
