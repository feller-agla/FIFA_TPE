import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from './database/database.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  getDashboard() {
    return this.database.dashboardSummary();
  }
}
