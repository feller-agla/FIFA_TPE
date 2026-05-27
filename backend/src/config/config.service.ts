import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ConfigService {
  private readonly database: DatabaseService;

  constructor(database: DatabaseService) {
    this.database = database;
  }

  async findAll() {
    const raw = await this.database.listConfig();
    const result: Record<string, string> = {};
    for (const item of raw) {
      if (item.id !== 'admin_password_hash' && item.id !== 'admin_password_salt') {
        result[item.id] = item.value;
      }
    }
    return result;
  }

  async update(body: Record<string, string>) {
    const promises = Object.entries(body).map(([key, val]) => {
      if (key === 'admin_password') {
        if (!val || val.trim() === '') return Promise.resolve(null);
        return this.database.changeAdminPassword(val);
      }
      return this.database.updateConfigValue(key, val);
    });
    await Promise.all(promises);
    return { success: true };
  }

  async verifyPassword(password: string) {
    const valid = await this.database.verifyAdminPassword(password);
    return { valid };
  }
}
