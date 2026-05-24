import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class DevicesService {
  constructor(private readonly database: DatabaseService) {}

  findAll() {
    return this.database.listDevices();
  }

  create(body: { deviceId?: string; label?: string; agentId?: number }) {
    const deviceId = body.deviceId?.trim();
    const label = body.label?.trim();
    if (!deviceId || !label) {
      throw new BadRequestException('deviceId and label are required');
    }

    return this.database.createDevice({ deviceId, label, agentId: body.agentId ?? null });
  }

  assign(deviceId: string, body: { agentId?: number }) {
    if (!body.agentId) {
      throw new BadRequestException('agentId is required');
    }
    return this.database.assignDevice(deviceId, body.agentId);
  }
}
