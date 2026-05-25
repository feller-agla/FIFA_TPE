import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuthService {
  constructor(private readonly database: DatabaseService) {}

  async login(body: { email?: string; password?: string }) {
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();

    if (!email || !password) {
      throw new BadRequestException('email and password are required');
    }

    const agent = await this.database.findAgentAuthByEmail(email);
    if (!agent || !agent.active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = this.database.verifyPassword(password, agent.password_salt, agent.password_hash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      agent: {
        id: agent.id,
        code: agent.code,
        full_name: agent.full_name,
        email: agent.email,
        phone: agent.phone,
        active: agent.active,
        created_at: agent.created_at,
      },
    };
  }
}