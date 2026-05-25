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
    const email = (body as { email?: string }).email?.trim().toLowerCase();
    const password = (body as { password?: string }).password?.trim();
    if (!code || !fullName || !email || !password) {
      throw new BadRequestException('code, fullName, email and password are required');
    }

    return this.database.createAgent({ code, fullName, email, password, phone: body.phone?.trim() || null });
  }

  update(id: number, body: { fullName?: string; email?: string; phone?: string; active?: boolean; password?: string }) {
    return this.database.updateAgent(id, {
      fullName: body.fullName?.trim(),
      email: body.email?.trim().toLowerCase(),
      phone: body.phone?.trim(),
      active: body.active,
      password: body.password?.trim(),
    });
  }
}
