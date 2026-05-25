import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AgentsService } from './agents.service';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agents: AgentsService) {}

  @Get()
  findAll() {
    return this.agents.findAll();
  }

  @Post()
  create(@Body() body: { code?: string; fullName?: string; email?: string; password?: string; phone?: string }) {
    return this.agents.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { code?: string; fullName?: string; email?: string; phone?: string; active?: boolean; password?: string },
  ) {
    return this.agents.update(Number(id), body);
  }
}
