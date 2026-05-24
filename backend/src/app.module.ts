import { Module } from '@nestjs/common';
import { AgentsController } from './agents/agents.controller';
import { AgentsService } from './agents/agents.service';
import { DatabaseModule } from './database/database.module';
import { DevicesController } from './devices/devices.controller';
import { DevicesService } from './devices/devices.service';
import { HealthController } from './health.controller';
import { TicketsController } from './tickets/tickets.controller';
import { TicketsService } from './tickets/tickets.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [
    HealthController,
    DashboardController,
    AgentsController,
    DevicesController,
    TicketsController,
  ],
  providers: [AgentsService, DevicesService, TicketsService],
})
export class AppModule {}
