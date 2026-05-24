import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return {
      status: 'ok',
      service: 'fifa-ticket-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
