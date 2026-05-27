import { PageHeader } from '@/components/PageHeader';
import { StatsCard } from '@/components/StatsCard';
import { StatusBadge } from '@/components/StatusBadge';

export const metadata = {
  title: 'Dashboard',
};

const apiBase = process.env.ADMIN_API_BASE_URL ?? 'https://fifa-tpe.onrender.com/api';

async function getDashboard() {
  const response = await fetch(`${apiBase}/dashboard`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Impossible de charger le dashboard');
  }
  return response.json();
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateStr;
  }
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount);
}

function getRelativeTime(dateStr: string): string {
  try {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'À l\'instant';
    if (diffMin < 60) return `Il y a ${diffMin}min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Il y a ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    return `Il y a ${diffD}j`;
  } catch {
    return '';
  }
}

export default async function DashboardPage() {
  const dashboard = await getDashboard();

  return (
    <>
      <PageHeader
        icon="📊"
        title="Dashboard"
        subtitle="Vue d'ensemble de l'activité FIFA Transport"
        breadcrumb={[{ label: 'Accueil' }]}
      />

      {/* Stats Cards */}
      <div className="stats-grid">
        <StatsCard
          label="Agents actifs"
          value={dashboard.agents}
          color="yellow"
        />
        <StatsCard
          label="Terminaux TPE"
          value={dashboard.devices}
          color="blue"
        />
        <StatsCard
          label="Tickets émis"
          value={dashboard.tickets}
          color="green"
        />
        <StatsCard
          label="Revenus totaux"
          value={
            (dashboard.recentTickets ?? []).reduce(
              (sum: number, t: { amount?: number }) => sum + (t.amount ?? 0),
              0
            )
          }
          color="yellow"
        />
      </div>

      {/* Two columns: Recent Tickets + Quick Activity */}
      <div className="section-grid">
        {/* Recent Tickets Table */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <div className="card-header-left">
              <span className="card-header-icon" aria-hidden="true">—</span>
              <div>
                <div className="card-title">Derniers tickets</div>
                <div className="card-subtitle">Les 10 tickets les plus récents</div>
              </div>
            </div>
            <a href="/tickets" className="btn btn-secondary" id="view-all-tickets-btn">
              Voir tout →
            </a>
          </div>
          <div className="card-body-flush">
            {(!dashboard.recentTickets || dashboard.recentTickets.length === 0) ? (
              <div className="empty-state">
                <div className="empty-state-icon" aria-hidden="true"></div>
                <div className="empty-state-title">Aucun ticket</div>
                <div className="empty-state-desc">
                  Aucun ticket n{"'"}a encore été émis par les TPE.
                </div>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Référence</th>
                      <th>Agent</th>
                      <th>Terminal</th>
                      <th>Service</th>
                      <th>Montant</th>
                      <th>Paiement</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.recentTickets.map((ticket: {
                      id: number;
                      reference: string;
                      agent_name?: string;
                      agent_code?: string;
                      device_label?: string;
                      service_type: string;
                      amount: number;
                      payment_mode: string;
                      created_at: string;
                    }) => (
                      <tr key={ticket.id}>
                        <td>
                          <span className="cell-mono">{ticket.reference}</span>
                        </td>
                        <td>
                          <span className="cell-primary">
                            {ticket.agent_name ?? '—'}
                          </span>
                          {ticket.agent_code && (
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                              {ticket.agent_code}
                            </div>
                          )}
                        </td>
                        <td>{ticket.device_label ?? '—'}</td>
                        <td>{ticket.service_type}</td>
                        <td>
                          <span className="cell-amount">
                            {formatAmount(ticket.amount)} FCFA
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={ticket.payment_mode} />
                        </td>
                        <td>
                          <div style={{ fontSize: '0.85rem' }}>{formatDate(ticket.created_at)}</div>
                          <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                            {getRelativeTime(ticket.created_at)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <a href="/agents" className="quick-action-card" id="quick-action-agents">
          <div className="quick-action-icon" aria-hidden="true"></div>
          <div className="quick-action-info">
            <h4>Gérer les agents</h4>
            <p>Ajouter, modifier ou désactiver</p>
          </div>
        </a>
        <a href="/devices" className="quick-action-card" id="quick-action-devices">
          <div className="quick-action-icon" aria-hidden="true"></div>
          <div className="quick-action-info">
            <h4>Gérer les TPE</h4>
            <p>Enregistrer et assigner des terminaux</p>
          </div>
        </a>
        <a href="/tickets" className="quick-action-card" id="quick-action-tickets">
          <div className="quick-action-icon" aria-hidden="true"></div>
          <div className="quick-action-info">
            <h4>Historique tickets</h4>
            <p>Rechercher et filtrer les tickets</p>
          </div>
        </a>
      </div>
    </>
  );
}
