import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuthService {
  constructor(private readonly database: DatabaseService) {}

  async login(body: { email?: string; password?: string; deviceId?: string }) {
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();
    const deviceId = body.deviceId?.trim();

    if (!email || !password || !deviceId) {
      throw new BadRequestException('email, password and deviceId are required');
    }

    const agent = await this.database.findAgentAuthByEmail(email);
    if (!agent || !agent.active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = this.database.verifyPassword(password, agent.password_salt, agent.password_hash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const session = await this.database.createAgentSession(agent.id, deviceId);

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
      session: {
        id: session.id,
        device_id: session.device_id,
        session_token: session.session_token,
        active: session.active,
        last_seen_at: session.last_seen_at,
        created_at: session.created_at,
      },
    };
  }

  async logout(body: { sessionToken?: string }) {
    const sessionToken = body.sessionToken?.trim();
    if (!sessionToken) {
      throw new BadRequestException('sessionToken is required');
    }

    const session = await this.database.findSessionByToken(sessionToken);
    if (!session) {
      return { success: true };
    }

    await this.database.revokeSession(session.id);
    return { success: true };
  }

  async checkSession(body: { sessionToken?: string }) {
    const sessionToken = body.sessionToken?.trim();
    if (!sessionToken) {
      return { active: false };
    }

    const session = await this.database.findSessionByToken(sessionToken);
    if (!session) {
      return { active: false };
    }

    await this.database.touchSession(sessionToken);
    return {
      active: true,
      session: {
        id: session.id,
        agent_id: session.agent_id,
        device_id: session.device_id,
        last_seen_at: session.last_seen_at,
      },
    };
  }

  async listSessions() {
    return this.database.listSessions();
  }

  async revokeSession(sessionId: number) {
    return this.database.revokeSession(sessionId);
  }
}