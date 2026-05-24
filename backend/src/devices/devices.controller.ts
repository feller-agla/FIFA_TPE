import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { DevicesService } from './devices.service';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Get()
  findAll() {
    return this.devices.findAll();
  }

  @Post()
  create(@Body() body: { deviceId?: string; label?: string; agentId?: number }) {
    return this.devices.create(body);
  }

  @Patch(':deviceId/assign')
  assign(@Param('deviceId') deviceId: string, @Body() body: { agentId?: number }) {
    return this.devices.assign(deviceId, body);
  }
}
