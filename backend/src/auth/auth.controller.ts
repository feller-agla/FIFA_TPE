import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() body: { email?: string; password?: string; deviceId?: string }) {
    return this.auth.login(body);
  }

  @Post('logout')
  logout(@Body() body: { sessionToken?: string }) {
    return this.auth.logout(body);
  }

  @Get('session')
  checkSession(@Query('sessionToken') sessionToken?: string) {
    return this.auth.checkSession({ sessionToken });
  }

  @Get('sessions')
  listSessions() {
    return this.auth.listSessions();
  }

  @Delete('sessions/:id')
  revokeSession(@Param('id') id: string) {
    return this.auth.revokeSession(Number(id));
  }
}