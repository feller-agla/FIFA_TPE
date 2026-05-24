import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AgentsService {
  constructor(private readonly database: DatabaseService) {}

  findAll() {
    return this.database.listAgents();
  }

  create(body: { code?: string; fullName?: string; phone?: string }) {
    const code = body.code?.trim();
    const fullName = body.fullName?.trim();
    if (!code || !fullName) {
      throw new BadRequestException('code and fullName are required');
    }

    return this.database.createAgent({ code, fullName, phone: body.phone?.trim() || null });
  }

  update(id: number, body: { fullName?: string; phone?: string; active?: boolean }) {
    return this.database.updateAgent(id, {
      fullName: body.fullName?.trim(),
      phone: body.phone?.trim(),
      active: body.active,
    });
  }
}
