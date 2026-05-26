import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class PricesService {
  constructor(private readonly database: DatabaseService) {}

  findAll() {
    return this.database.listPrices();
  }

  update(id: string, body: { amount?: number }) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new BadRequestException('amount must be a non-negative number');
    }
    return this.database.updatePrice(id, amount);
  }
}
