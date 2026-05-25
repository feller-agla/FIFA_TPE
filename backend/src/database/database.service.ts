import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';

export type AgentRow = {
  id: number;
  code: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  created_at: string;
};

export type AgentAuthRow = AgentRow & {
  password_hash: string;
  password_salt: string;
};

export type DeviceRow = {
  id: number;
  device_id: string;
  label: string;
  agent_id: number | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type TicketRow = {
  id: number;
  reference: string;
  device_id: string;
  agent_id: number;
  service_type: string;
  route: string;
  amount: number;
  payment_mode: string;
  passenger_name: string | null;
  passenger_phone: string | null;
  package_details: string | null;
  receiver_name: string | null;
  receiver_phone: string | null;
  ticket_text: string | null;
  created_at: string;
};

@Injectable()
export class DatabaseService implements OnModuleInit {
  private supabase!: SupabaseClient;

  onModuleInit() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_KEY ??
      process.env.SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
      throw new BadRequestException(
        'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY).',
      );
    }

    this.supabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  async listAgents() {
    const { data, error } = await this.supabase
      .from('agents')
      .select('id, code, full_name, email, phone, active, created_at')
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data as AgentRow[];
  }

  async createAgent(body: { code: string; fullName: string; email: string; password: string; phone?: string | null }) {
    const { salt, hash } = this.hashPassword(body.password);
    const { data, error } = await this.supabase
      .from('agents')
      .insert({
        code: body.code,
        full_name: body.fullName,
        email: body.email,
        password_hash: hash,
        password_salt: salt,
        phone: body.phone ?? null,
        active: true,
      })
      .select('id, code, full_name, email, phone, active, created_at')
      .single();

    if (error) throw new BadRequestException(error.message);
    return data as AgentRow;
  }

  async updateAgent(
    id: number,
    body: { fullName?: string; email?: string | null; phone?: string | null; active?: boolean; password?: string | null },
  ) {
    const patch: Record<string, unknown> = {};
    if (body.fullName !== undefined) patch.full_name = body.fullName;
    if (body.email !== undefined) patch.email = body.email;
    if (body.phone !== undefined) patch.phone = body.phone;
    if (body.active !== undefined) patch.active = body.active;
    if (body.password) {
      const { salt, hash } = this.hashPassword(body.password);
      patch.password_hash = hash;
      patch.password_salt = salt;
    }

    const { data, error } = await this.supabase
      .from('agents')
      .update(patch)
      .eq('id', id)
      .select('id, code, full_name, email, phone, active, created_at')
      .single();

    if (error) throw new BadRequestException(error.message);
    return data as AgentRow;
  }

  async findAgentAuthByEmail(email: string) {
    const { data, error } = await this.supabase
      .from('agents')
      .select('id, code, full_name, email, phone, active, created_at, password_hash, password_salt')
      .eq('email', email)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    return data as AgentAuthRow | null;
  }

  verifyPassword(password: string, salt: string, expectedHash: string) {
    const computedHash = pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
    const computedBuffer = Buffer.from(computedHash, 'hex');
    const expectedBuffer = Buffer.from(expectedHash, 'hex');

    if (computedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(computedBuffer, expectedBuffer);
  }

  private hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
    return { salt, hash };
  }

  async listDevices() {
    const { data, error } = await this.supabase
      .from('devices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    const agentIds = [...new Set((data ?? []).map((device) => device.agent_id).filter(Boolean))] as number[];
    const agents = agentIds.length
      ? await this.supabase.from('agents').select('id, code, full_name').in('id', agentIds)
      : { data: [], error: null };

    if (agents.error) throw new BadRequestException(agents.error.message);

    const agentById = new Map<number, { code: string; full_name: string }>();
    for (const agent of agents.data ?? []) {
      agentById.set(agent.id, agent);
    }

    return (data ?? []).map((device) => ({
      ...device,
      agent_code: device.agent_id ? agentById.get(device.agent_id)?.code ?? null : null,
      agent_name: device.agent_id ? agentById.get(device.agent_id)?.full_name ?? null : null,
    }));
  }

  async createDevice(body: { deviceId: string; label: string; agentId?: number | null }) {
    const existing = await this.supabase
      .from('devices')
      .select('*')
      .eq('device_id', body.deviceId)
      .maybeSingle();

    if (existing.error) {
      throw new BadRequestException(existing.error.message);
    }

    if (existing.data) {
      const patch: Record<string, unknown> = { label: body.label };
      if (body.agentId !== undefined && body.agentId !== null) {
        patch.agent_id = body.agentId;
        patch.status = 'assigned';
      }

      const { data, error } = await this.supabase
        .from('devices')
        .update(patch)
        .eq('device_id', body.deviceId)
        .select('*')
        .single();

      if (error) throw new BadRequestException(error.message);
      return data as DeviceRow;
    }

    const { data, error } = await this.supabase
      .from('devices')
      .insert({
        device_id: body.deviceId,
        label: body.label,
        agent_id: body.agentId ?? null,
        status: body.agentId ? 'assigned' : 'pending',
      })
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);
    return data as DeviceRow;
  }

  async assignDevice(deviceId: string, agentId: number) {
    const { data, error } = await this.supabase
      .from('devices')
      .update({ agent_id: agentId, status: 'assigned', updated_at: new Date().toISOString() })
      .eq('device_id', deviceId)
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);
    return data as DeviceRow;
  }

  async dashboardSummary() {
    const [agentsResult, devicesResult, ticketsResult, recentTicketsResult] = await Promise.all([
      this.supabase.from('agents').select('id', { count: 'exact', head: true }),
      this.supabase.from('devices').select('id', { count: 'exact', head: true }),
      this.supabase.from('tickets').select('id', { count: 'exact', head: true }),
      this.supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(10),
    ]);

    if (agentsResult.error) throw new BadRequestException(agentsResult.error.message);
    if (devicesResult.error) throw new BadRequestException(devicesResult.error.message);
    if (ticketsResult.error) throw new BadRequestException(ticketsResult.error.message);
    if (recentTicketsResult.error) throw new BadRequestException(recentTicketsResult.error.message);

    const agentIds = [...new Set((recentTicketsResult.data ?? []).map((ticket) => ticket.agent_id))] as number[];
    const deviceIds = [...new Set((recentTicketsResult.data ?? []).map((ticket) => ticket.device_id))];
    const [recentAgentsResult, recentDevicesResult] = await Promise.all([
      agentIds.length ? this.supabase.from('agents').select('id, code, full_name').in('id', agentIds) : Promise.resolve({ data: [], error: null }),
      deviceIds.length ? this.supabase.from('devices').select('device_id, label').in('device_id', deviceIds) : Promise.resolve({ data: [], error: null }),
    ]);

    if (recentAgentsResult.error) throw new BadRequestException(recentAgentsResult.error.message);
    if (recentDevicesResult.error) throw new BadRequestException(recentDevicesResult.error.message);

    const agentById = new Map<number, { code: string; full_name: string }>();
    for (const agent of recentAgentsResult.data ?? []) {
      agentById.set(agent.id, agent);
    }

    const deviceById = new Map<string, { label: string }>();
    for (const device of recentDevicesResult.data ?? []) {
      deviceById.set(device.device_id, device);
    }

    return {
      agents: agentsResult.count ?? 0,
      devices: devicesResult.count ?? 0,
      tickets: ticketsResult.count ?? 0,
      recentTickets: (recentTicketsResult.data ?? []).map((ticket) => ({
        ...ticket,
        agent_name: agentById.get(ticket.agent_id)?.full_name ?? null,
        agent_code: agentById.get(ticket.agent_id)?.code ?? null,
        device_label: deviceById.get(ticket.device_id)?.label ?? null,
      })),
    };
  }

  async listTickets() {
    const { data, error } = await this.supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    const agentIds = [...new Set((data ?? []).map((ticket) => ticket.agent_id))] as number[];
    const deviceIds = [...new Set((data ?? []).map((ticket) => ticket.device_id))];
    const [agentsResult, devicesResult] = await Promise.all([
      agentIds.length ? this.supabase.from('agents').select('id, code, full_name').in('id', agentIds) : Promise.resolve({ data: [], error: null }),
      deviceIds.length ? this.supabase.from('devices').select('device_id, label').in('device_id', deviceIds) : Promise.resolve({ data: [], error: null }),
    ]);

    if (agentsResult.error) throw new BadRequestException(agentsResult.error.message);
    if (devicesResult.error) throw new BadRequestException(devicesResult.error.message);

    const agentById = new Map<number, { code: string; full_name: string }>();
    for (const agent of agentsResult.data ?? []) {
      agentById.set(agent.id, agent);
    }

    const deviceById = new Map<string, { label: string }>();
    for (const device of devicesResult.data ?? []) {
      deviceById.set(device.device_id, device);
    }

    return (data ?? []).map((ticket) => ({
      ...ticket,
      agent_code: agentById.get(ticket.agent_id)?.code ?? null,
      agent_name: agentById.get(ticket.agent_id)?.full_name ?? null,
      device_label: deviceById.get(ticket.device_id)?.label ?? null,
    }));
  }

  async createTicket(body: {
    reference: string;
    deviceId: string;
    agentId?: number | null;
    serviceType: string;
    route: string;
    amount: number;
    paymentMode?: string;
    passengerName?: string | null;
    passengerPhone?: string | null;
    packageDetails?: string | null;
    receiverName?: string | null;
    receiverPhone?: string | null;
    ticketText?: string | null;
  }) {
    const { data: device, error: deviceError } = await this.supabase
      .from('devices')
      .select('agent_id')
      .eq('device_id', body.deviceId)
      .maybeSingle();

    if (deviceError) throw new BadRequestException(deviceError.message);

    const agentId = body.agentId ?? device?.agent_id ?? null;
    if (!agentId) {
      throw new BadRequestException('This device is not assigned to an agent yet');
    }

    const { data, error } = await this.supabase
      .from('tickets')
      .insert({
        reference: body.reference,
        device_id: body.deviceId,
        agent_id: agentId,
        service_type: body.serviceType,
        route: body.route,
        amount: body.amount,
        payment_mode: body.paymentMode ?? 'cash',
        passenger_name: body.passengerName ?? null,
        passenger_phone: body.passengerPhone ?? null,
        package_details: body.packageDetails ?? null,
        receiver_name: body.receiverName ?? null,
        receiver_phone: body.receiverPhone ?? null,
        ticket_text: body.ticketText ?? null,
      })
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);
    return data as TicketRow;
  }
}
