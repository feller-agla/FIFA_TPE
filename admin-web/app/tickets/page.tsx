"use client";

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { DataTable, type Column } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';

const apiBase = process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL ?? '/api';

type Ticket = {
  id: number;
  reference: string;
  device_id: string;
  agent_id: number;
  agent_code: string | null;
  agent_name: string | null;
  device_label: string | null;
  service_type: string;
  route: string;
  amount: number;
  payment_mode: string;
  passenger_name: string | null;
  passenger_phone: string | null;
  package_details: string | null;
  receiver_name: string | null;
  receiver_phone: string | null;
  created_at: string;
};

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount);
}

const columns: Column<Ticket>[] = [
  {
    key: 'reference',
    label: 'Référence',
    sortable: true,
    render: (row) => <span className="cell-mono">{row.reference}</span>,
  },
  {
    key: 'agent_name',
    label: 'Agent',
    sortable: true,
    render: (row) => {
      if (!row.agent_name) return '—';
      return (
        <div>
          <span className="cell-primary">{row.agent_name}</span>
          {row.agent_code && (
            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
              {row.agent_code}
            </div>
          )}
        </div>
      );
    },
  },
  {
    key: 'device_label',
    label: 'Terminal',
    sortable: true,
    render: (row) => row.device_label ?? row.device_id,
  },
  {
    key: 'service_type',
    label: 'Service',
    sortable: true,
    render: (row) => (
      <span className="badge badge-neutral">{row.service_type}</span>
    ),
  },
  {
    key: 'route',
    label: 'Trajet',
    sortable: true,
    render: (row) => <span className="cell-primary">{row.route}</span>,
  },
  {
    key: 'amount',
    label: 'Montant',
    sortable: true,
    render: (row) => (
      <span className="cell-amount">{formatAmount(row.amount)} FCFA</span>
    ),
  },
  {
    key: 'payment_mode',
    label: 'Paiement',
    sortable: true,
    render: (row) => <StatusBadge status={row.payment_mode} />,
  },
  {
    key: 'passenger_name',
    label: 'Passager',
    render: (row) => row.passenger_name ?? '—',
  },
  {
    key: 'created_at',
    label: 'Date',
    sortable: true,
    render: (row) => (
      <span style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
        {formatDate(row.created_at)}
      </span>
    ),
  },
];

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/tickets`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Impossible de charger les tickets');
      const data = await response.json();
      setTickets(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  if (loading) {
    return (
      <>
        <PageHeader
          icon="🎫"
          title="Tickets"
          subtitle="Historique complet des tickets émis"
          breadcrumb={[
            { label: 'Dashboard', href: '/' },
            { label: 'Tickets' },
          ]}
        />
        <div className="card">
          <div className="empty-state">
            <div className="loading-dots" aria-label="Chargement">
              <span /><span /><span />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader
          icon="🎫"
          title="Tickets"
          subtitle="Historique complet des tickets émis"
          breadcrumb={[
            { label: 'Dashboard', href: '/' },
            { label: 'Tickets' },
          ]}
        />
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">⚠️</div>
            <div className="empty-state-title">Erreur de chargement</div>
            <div className="empty-state-desc">{error}</div>
            <button className="btn btn-primary mt-md" onClick={fetchTickets} type="button">
              Réessayer
            </button>
          </div>
        </div>
      </>
    );
  }

  const totalRevenue = tickets.reduce((sum, t) => sum + t.amount, 0);
  const serviceTypes = [...new Set(tickets.map((t) => t.service_type))];

  return (
    <>
      <PageHeader
        icon="🎫"
        title="Tickets"
        subtitle={`${tickets.length} ticket${tickets.length !== 1 ? 's' : ''} émis au total`}
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Tickets' },
        ]}
      />

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon blue">
              <span aria-hidden="true">🎫</span>
            </div>
          </div>
          <div className="stat-card-value">{tickets.length.toLocaleString('fr-FR')}</div>
          <div className="stat-card-label">Tickets totaux</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon yellow">
              <span aria-hidden="true">💰</span>
            </div>
          </div>
          <div className="stat-card-value">{formatAmount(totalRevenue)}</div>
          <div className="stat-card-label">Revenus totaux (FCFA)</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon green">
              <span aria-hidden="true">📊</span>
            </div>
          </div>
          <div className="stat-card-value">
            {tickets.length > 0 ? formatAmount(Math.round(totalRevenue / tickets.length)) : 0}
          </div>
          <div className="stat-card-label">Montant moyen (FCFA)</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon red">
              <span aria-hidden="true">🚌</span>
            </div>
          </div>
          <div className="stat-card-value">{serviceTypes.length}</div>
          <div className="stat-card-label">Types de service</div>
        </div>
      </div>

      <DataTable<Ticket>
        columns={columns}
        data={tickets}
        searchKeys={['reference', 'agent_name', 'agent_code', 'device_label', 'service_type', 'route', 'passenger_name']}
        searchPlaceholder="Rechercher par référence, agent, trajet, passager..."
        idKey="id"
        emptyIcon="🎫"
        emptyTitle="Aucun ticket"
        emptyDesc="Aucun ticket n'a encore été émis par les TPE."
      />
    </>
  );
}
