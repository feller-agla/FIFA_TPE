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

  @Post('register')
  register(@Body() body: { sessionToken?: string; deviceId?: string; label?: string }) {
    return this.devices.register(body);
  }

  @Patch(':deviceId/assign')
  assign(@Param('deviceId') deviceId: string, @Body() body: { agentId?: number }) {
    return this.devices.assign(deviceId, body);
  }

  @Patch(':deviceId')
  update(
    @Param('deviceId') deviceId: string,
    @Body() body: { label?: string; agentId?: number; status?: string },
  ) {
    return this.devices.update(deviceId, body);
  }
}
