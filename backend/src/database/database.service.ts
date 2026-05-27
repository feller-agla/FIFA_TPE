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
  sender_name: string | null;
  sender_phone: string | null;
  receiver_name: string | null;
  receiver_phone: string | null;
  ticket_text: string | null;
  created_at: string;
};

export type PassengerSuggestionRow = {
  passenger_name: string;
  passenger_phone: string | null;
  ticket_count: number;
  last_seen_at: string;
};

export type AgentSessionRow = {
  id: number;
  agent_id: number;
  device_id: string;
  session_token: string;
  active: boolean;
  last_seen_at: string;
  revoked_at: string | null;
  created_at: string;
};

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

@Injectable()
export class DatabaseService implements OnModuleInit {
  private supabase!: SupabaseClient;

  private localConfig: Record<string, string> = {
    company_name: 'FIFA Transport',
    company_ifu: '3202612345678',
    company_rccm: 'RB-COT-26-B-1234',
    company_address: 'Avenue Steinmetz, Cotonou',
    company_phone: '+229 21 30 00 00',
    company_city: 'Cotonou',
    company_country: 'Bénin',
  };

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

    const { salt, hash } = this.hashPassword('admin');
    this.localConfig.admin_password_hash = hash;
    this.localConfig.admin_password_salt = salt;
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
    body: { code?: string; fullName?: string; email?: string | null; phone?: string | null; active?: boolean; password?: string | null },
  ) {
    const patch: Record<string, unknown> = {};
    if (body.code !== undefined) patch.code = body.code;
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

  async createAgentSession(agentId: number, deviceId: string) {
    const activeSession = await this.supabase
      .from('agent_sessions')
      .select('*')
      .eq('agent_id', agentId)
      .eq('active', true)
      .order('last_seen_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeSession.error) {
      throw new BadRequestException(activeSession.error.message);
    }

    if (activeSession.data) {
      const sessionAge = Date.now() - new Date(activeSession.data.last_seen_at).getTime();
      const isFresh = sessionAge < SESSION_TTL_MS;

      if (isFresh && activeSession.data.device_id !== deviceId) {
        throw new BadRequestException('Agent already connected on another TPE');
      }

      if (isFresh && activeSession.data.device_id === deviceId) {
        const { data, error } = await this.supabase
          .from('agent_sessions')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', activeSession.data.id)
          .select('*')
          .single();

        if (error) throw new BadRequestException(error.message);
        return data as AgentSessionRow;
      }

      await this.supabase
        .from('agent_sessions')
        .update({ active: false, revoked_at: new Date().toISOString() })
        .eq('id', activeSession.data.id);
    }

    const { data, error } = await this.supabase
      .from('agent_sessions')
      .insert({
        agent_id: agentId,
        device_id: deviceId,
        session_token: randomBytes(24).toString('hex'),
        active: true,
        last_seen_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);
    return data as AgentSessionRow;
  }

  async findSessionByToken(sessionToken: string) {
    const { data, error } = await this.supabase
      .from('agent_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .eq('active', true)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data) return null;

    const sessionAge = Date.now() - new Date(data.last_seen_at).getTime();
    if (sessionAge >= SESSION_TTL_MS) {
      await this.supabase
        .from('agent_sessions')
        .update({ active: false, revoked_at: new Date().toISOString() })
        .eq('id', data.id);
      return null;
    }

    return data as AgentSessionRow;
  }

  async touchSession(sessionToken: string) {
    const { data, error } = await this.supabase
      .from('agent_sessions')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('session_token', sessionToken)
      .eq('active', true)
      .select('*')
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    return data as AgentSessionRow | null;
  }

  async revokeSession(sessionId: number) {
    const { data, error } = await this.supabase
      .from('agent_sessions')
      .update({ active: false, revoked_at: new Date().toISOString() })
      .eq('id', sessionId)
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);
    return data as AgentSessionRow;
  }

  async listSessions() {
    const { data, error } = await this.supabase
      .from('agent_sessions')
      .select('id, agent_id, device_id, active, last_seen_at, revoked_at, created_at')
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    const agentIds = [...new Set((data ?? []).map((session) => session.agent_id))] as number[];
    const deviceIds = [...new Set((data ?? []).map((session) => session.device_id))];
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

    return (data ?? []).map((session) => ({
      ...session,
      agent_code: agentById.get(session.agent_id)?.code ?? null,
      agent_name: agentById.get(session.agent_id)?.full_name ?? null,
      device_label: deviceById.get(session.device_id)?.label ?? null,
    }));
  }

  async registerDeviceFromSession(body: { sessionToken: string; deviceId: string; label: string }) {
    const session = await this.findSessionByToken(body.sessionToken);
    if (!session) {
      throw new BadRequestException('Invalid or expired session');
    }

    if (session.device_id !== body.deviceId) {
      throw new BadRequestException('This session is bound to another device');
    }

    const existing = await this.supabase
      .from('devices')
      .select('*')
      .eq('device_id', body.deviceId)
      .maybeSingle();

    if (existing.error) {
      throw new BadRequestException(existing.error.message);
    }

    const patch = {
      device_id: body.deviceId,
      label: body.label,
      agent_id: session.agent_id,
      status: 'assigned',
      updated_at: new Date().toISOString(),
    };

    const result = existing.data
      ? await this.supabase.from('devices').update(patch).eq('device_id', body.deviceId).select('*').single()
      : await this.supabase.from('devices').insert(patch).select('*').single();

    if (result.error) throw new BadRequestException(result.error.message);
    await this.touchSession(body.sessionToken);
    return result.data as DeviceRow;
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

  async nextDeviceId() {
    const { data, error } = await this.supabase
      .from('devices')
      .select('device_id');

    if (error) throw new BadRequestException(error.message);

    const nextNumber = (data ?? [])
      .map((device) => {
        const match = /^TPE-(\d+)$/.exec(device.device_id);
        return match ? Number(match[1]) : 0;
      })
      .reduce((max, value) => Math.max(max, value), 0) + 1;

    return { deviceId: `TPE-${nextNumber}` };
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

  async updateDevice(deviceId: string, body: { label?: string | null; agentId?: number | null; status?: string | null }) {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.label !== undefined) patch.label = body.label;
    if (body.agentId !== undefined) patch.agent_id = body.agentId;
    if (body.status !== undefined) patch.status = body.status;

    const { data, error } = await this.supabase
      .from('devices')
      .update(patch)
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

  async listTickets(agentId?: number) {
    let query = this.supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (agentId !== undefined) {
      query = query.eq('agent_id', agentId);
    }

    const { data, error } = await query;

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
    sessionToken?: string | null;
    serviceType: string;
    route: string;
    amount: number;
    paymentMode?: string;
    passengerName?: string | null;
    passengerPhone?: string | null;
    packageDetails?: string | null;
    senderName?: string | null;
    senderPhone?: string | null;
    receiverName?: string | null;
    receiverPhone?: string | null;
    ticketText?: string | null;
  }) {
    let agentId = body.agentId ?? null;
    let deviceId = body.deviceId;

    if (body.sessionToken) {
      const session = await this.findSessionByToken(body.sessionToken);
      if (!session) {
        throw new BadRequestException('Invalid or expired session');
      }

      if (session.device_id !== body.deviceId) {
        throw new BadRequestException('This request does not match the logged device');
      }

      agentId = session.agent_id;
      deviceId = session.device_id;
      await this.touchSession(body.sessionToken);
    }

    if (!agentId) {
      const { data: device, error: deviceError } = await this.supabase
        .from('devices')
        .select('agent_id')
        .eq('device_id', deviceId)
        .maybeSingle();

      if (deviceError) throw new BadRequestException(deviceError.message);
      agentId = device?.agent_id ?? null;
    }

    if (!agentId) {
      throw new BadRequestException('This device is not assigned to an agent yet');
    }

    const { data: deviceRow, error: upsertDeviceError } = await this.supabase
      .from('devices')
      .select('*')
      .eq('device_id', deviceId)
      .maybeSingle();

    if (upsertDeviceError) throw new BadRequestException(upsertDeviceError.message);

    if (!deviceRow) {
      const { error: createDeviceError } = await this.supabase
        .from('devices')
        .insert({
          device_id: deviceId,
          label: deviceId,
          agent_id: agentId,
          status: 'assigned',
        });

      if (createDeviceError) throw new BadRequestException(createDeviceError.message);
    }

    const { data, error } = await this.supabase
      .from('tickets')
      .insert({
        reference: body.reference,
        device_id: deviceId,
        agent_id: agentId,
        service_type: body.serviceType,
        route: body.route,
        amount: body.amount,
        payment_mode: body.paymentMode ?? 'cash',
        passenger_name: body.passengerName ?? null,
        passenger_phone: body.passengerPhone ?? null,
        package_details: body.packageDetails ?? null,
        sender_name: body.senderName ?? null,
        sender_phone: body.senderPhone ?? null,
        receiver_name: body.receiverName ?? null,
        receiver_phone: body.receiverPhone ?? null,
        ticket_text: body.ticketText ?? null,
      })
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);
    return data as TicketRow;
  }

  async updateTicket(
    id: number,
    body: {
      reference?: string;
      deviceId?: string;
      agentId?: number;
      serviceType?: string;
      route?: string;
      amount?: number;
      paymentMode?: string;
      passengerName?: string | null;
      passengerPhone?: string | null;
      packageDetails?: string | null;
      senderName?: string | null;
      senderPhone?: string | null;
      receiverName?: string | null;
      receiverPhone?: string | null;
      ticketText?: string | null;
    },
  ) {
    const patch: Record<string, unknown> = {};
    if (body.reference !== undefined) patch.reference = body.reference;
    if (body.deviceId !== undefined) patch.device_id = body.deviceId;
    if (body.agentId !== undefined) patch.agent_id = body.agentId;
    if (body.serviceType !== undefined) patch.service_type = body.serviceType;
    if (body.route !== undefined) patch.route = body.route;
    if (body.amount !== undefined) patch.amount = body.amount;
    if (body.paymentMode !== undefined) patch.payment_mode = body.paymentMode;
    if (body.passengerName !== undefined) patch.passenger_name = body.passengerName;
    if (body.passengerPhone !== undefined) patch.passenger_phone = body.passengerPhone;
    if (body.packageDetails !== undefined) patch.package_details = body.packageDetails;
    if (body.senderName !== undefined) patch.sender_name = body.senderName;
    if (body.senderPhone !== undefined) patch.sender_phone = body.senderPhone;
    if (body.receiverName !== undefined) patch.receiver_name = body.receiverName;
    if (body.receiverPhone !== undefined) patch.receiver_phone = body.receiverPhone;
    if (body.ticketText !== undefined) patch.ticket_text = body.ticketText;

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('No ticket fields provided');
    }

    const { data, error } = await this.supabase
      .from('tickets')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);
    return data as TicketRow;
  }

  async searchPassengerSuggestions(query?: string) {
    const normalized = query?.trim() ?? '';
    if (normalized.length < 1) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('tickets')
      .select('passenger_name, passenger_phone, created_at')
      .not('passenger_name', 'is', null)
      .ilike('passenger_name', `${normalized}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new BadRequestException(error.message);

    const seen = new Map<string, PassengerSuggestionRow>();
    for (const row of data ?? []) {
      const passengerName = String(row.passenger_name ?? '').trim();
      if (!passengerName) continue;
      const passengerPhone = row.passenger_phone ? String(row.passenger_phone).trim() : null;
      const key = `${passengerName.toLowerCase()}|${passengerPhone ?? ''}`;
      if (!seen.has(key)) {
        seen.set(key, {
          passenger_name: passengerName,
          passenger_phone: passengerPhone,
          ticket_count: 1,
          last_seen_at: row.created_at,
        });
      } else {
        const existing = seen.get(key)!;
        existing.ticket_count += 1;
        if (new Date(row.created_at).getTime() > new Date(existing.last_seen_at).getTime()) {
          existing.last_seen_at = row.created_at;
        }
      }
    }
    return [...seen.values()].slice(0, 10);
  }

  async listPrices() {
    const { data, error } = await this.supabase
      .from('prices')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updatePrice(id: string, amount: number) {
    const { data, error } = await this.supabase
      .from('prices')
      .update({ amount, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async listConfig() {
    try {
      const { data, error } = await this.supabase
        .from('config')
        .select('*');

      if (error) {
        if (error.message.includes("Could not find the table")) {
          return Object.entries(this.localConfig).map(([id, value]) => ({ id, value }));
        }
        throw new BadRequestException(error.message);
      }

      if (!data || data.length === 0) {
        const { salt, hash } = this.hashPassword('admin');
        const defaults = [
          { id: 'company_name', value: 'FIFA Transport' },
          { id: 'company_ifu', value: '3202612345678' },
          { id: 'company_rccm', value: 'RB-COT-26-B-1234' },
          { id: 'company_address', value: 'Avenue Steinmetz, Cotonou' },
          { id: 'company_phone', value: '+229 21 30 00 00' },
          { id: 'company_city', value: 'Cotonou' },
          { id: 'company_country', value: 'Bénin' },
          { id: 'admin_password_hash', value: hash },
          { id: 'admin_password_salt', value: salt }
        ];

        const { error: insertError } = await this.supabase
          .from('config')
          .insert(defaults);
        if (insertError) throw new BadRequestException(insertError.message);
        
        const { data: refetched } = await this.supabase.from('config').select('*');
        return refetched || [];
      }

      return data;
    } catch {
      return Object.entries(this.localConfig).map(([id, value]) => ({ id, value }));
    }
  }

  async updateConfigValue(id: string, value: string) {
    try {
      const { data, error } = await this.supabase
        .from('config')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        if (error.message.includes("Could not find the table")) {
          this.localConfig[id] = value;
          return { id, value };
        }
        throw new BadRequestException(error.message);
      }
      return data;
    } catch {
      this.localConfig[id] = value;
      return { id, value };
    }
  }

  async verifyAdminPassword(password: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('config')
        .select('*')
        .in('id', ['admin_password_hash', 'admin_password_salt']);

      if (error) {
        if (error.message.includes("Could not find the table")) {
          const hash = this.localConfig.admin_password_hash;
          const salt = this.localConfig.admin_password_salt;
          return this.verifyPassword(password, salt, hash);
        }
        throw new BadRequestException(error.message);
      }
      if (!data || data.length < 2) {
        return password === 'admin';
      }

      const hashRow = data.find(r => r.id === 'admin_password_hash');
      const saltRow = data.find(r => r.id === 'admin_password_salt');

      if (!hashRow || !saltRow) return false;

      return this.verifyPassword(password, saltRow.value, hashRow.value);
    } catch {
      const hash = this.localConfig.admin_password_hash;
      const salt = this.localConfig.admin_password_salt;
      return this.verifyPassword(password, salt, hash);
    }
  }

  async changeAdminPassword(password: string) {
    const { salt, hash } = this.hashPassword(password);
    await Promise.all([
      this.updateConfigValue('admin_password_hash', hash),
      this.updateConfigValue('admin_password_salt', salt)
    ]);
    return { success: true };
  }
}
