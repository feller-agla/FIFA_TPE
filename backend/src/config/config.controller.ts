import { Body, Controller, Get, Post, Patch } from '@nestjs/common';
import { ConfigService } from './config.service';

@Controller('config')
export class ConfigController {
  private readonly configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  @Get()
  findAll() {
    return this.configService.findAll();
  }

  @Patch()
  update(@Body() body: Record<string, string>) {
    return this.configService.update(body);
  }

  @Post('verify')
  verify(@Body() body: { password?: string }) {
    return this.configService.verifyPassword(body.password ?? '');
  }
}
