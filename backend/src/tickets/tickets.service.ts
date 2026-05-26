import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class TicketsService {
  constructor(private readonly database: DatabaseService) {}

  findAll() {
    return this.database.listTickets();
  }

  findPassengers(query?: string) {
    return this.database.searchPassengerSuggestions(query);
  }

  create(body: {
    reference?: string;
    deviceId?: string;
    agentId?: number;
    sessionToken?: string;
    serviceType?: string;
    route?: string;
    amount?: number;
    paymentMode?: string;
    passengerName?: string;
    passengerPhone?: string;
    packageDetails?: string;
    receiverName?: string;
    receiverPhone?: string;
    ticketText?: string;
  }) {
    const reference = body.reference?.trim();
    const deviceId = body.deviceId?.trim();
    const serviceType = body.serviceType?.trim();
    const route = body.route?.trim();
    const amount = Number(body.amount ?? 0);

    if (!reference || !deviceId || !serviceType || !route || !Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('reference, deviceId, serviceType, route and amount are required');
    }

    return this.database.createTicket({
      reference,
      deviceId,
      agentId: body.agentId ?? null,
      sessionToken: body.sessionToken?.trim() || null,
      serviceType,
      route,
      amount,
      paymentMode: body.paymentMode?.trim() || 'cash',
      passengerName: body.passengerName?.trim() || null,
      passengerPhone: body.passengerPhone?.trim() || null,
      packageDetails: body.packageDetails?.trim() || null,
      receiverName: body.receiverName?.trim() || null,
      receiverPhone: body.receiverPhone?.trim() || null,
      ticketText: body.ticketText?.trim() || null,
    });
  }

  update(
    id: number,
    body: {
      reference?: string;
      deviceId?: string;
      agentId?: number | null;
      serviceType?: string;
      route?: string;
      amount?: number;
      paymentMode?: string;
      passengerName?: string | null;
      passengerPhone?: string | null;
      packageDetails?: string | null;
      receiverName?: string | null;
      receiverPhone?: string | null;
      ticketText?: string | null;
    },
  ) {
    return this.database.updateTicket(id, {
      reference: body.reference?.trim(),
      deviceId: body.deviceId?.trim(),
      agentId: body.agentId ?? undefined,
      serviceType: body.serviceType?.trim(),
      route: body.route?.trim(),
      amount: body.amount,
      paymentMode: body.paymentMode?.trim(),
      passengerName: body.passengerName?.trim() ?? null,
      passengerPhone: body.passengerPhone?.trim() ?? null,
      packageDetails: body.packageDetails?.trim() ?? null,
      receiverName: body.receiverName?.trim() ?? null,
      receiverPhone: body.receiverPhone?.trim() ?? null,
      ticketText: body.ticketText?.trim() ?? null,
    });
  }
}
