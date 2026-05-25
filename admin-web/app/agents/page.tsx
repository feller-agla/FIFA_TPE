"use client";

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { DataTable, type Column } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { ActionForm } from '@/components/ActionForm';

const apiBase = process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL ?? '/api';

type Agent = {
  id: number;
  code: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  created_at: string;
};

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

const columns: Column<Agent>[] = [
  {
    key: 'code',
    label: 'Code',
    sortable: true,
    render: (row) => <span className="cell-mono">{row.code}</span>,
  },
  {
    key: 'full_name',
    label: 'Nom complet',
    sortable: true,
    render: (row) => <span className="cell-primary">{row.full_name}</span>,
  },
  {
    key: 'email',
    label: 'Email',
    render: (row) => row.email ?? '—',
  },
  {
    key: 'phone',
    label: 'Téléphone',
    render: (row) => row.phone ?? '—',
  },
  {
    key: 'active',
    label: 'Statut',
    sortable: true,
    render: (row) => <StatusBadge status={String(row.active)} />,
  },
  {
    key: 'created_at',
    label: 'Créé le',
    sortable: true,
    render: (row) => formatDate(row.created_at),
  },
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/agents`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Impossible de charger les agents');
      const data = await response.json();
      setAgents(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleSuccess = useCallback(() => {
    setShowModal(false);
    fetchAgents();
  }, [fetchAgents]);

  if (loading) {
    return (
      <>
        <PageHeader
          icon="👤"
          title="Agents"
          subtitle="Gestion des agents FIFA Transport"
          breadcrumb={[
            { label: 'Dashboard', href: '/' },
            { label: 'Agents' },
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
          icon="👤"
          title="Agents"
          subtitle="Gestion des agents FIFA Transport"
          breadcrumb={[
            { label: 'Dashboard', href: '/' },
            { label: 'Agents' },
          ]}
        />
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">⚠️</div>
            <div className="empty-state-title">Erreur de chargement</div>
            <div className="empty-state-desc">{error}</div>
            <button
              className="btn btn-primary mt-md"
              onClick={fetchAgents}
              type="button"
            >
              Réessayer
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        icon="👤"
        title="Agents"
        subtitle={`${agents.length} agent${agents.length !== 1 ? 's' : ''} enregistré${agents.length !== 1 ? 's' : ''}`}
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Agents' },
        ]}
        actions={
          <button
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
            type="button"
            id="add-agent-btn"
          >
            <span className="btn-icon-left" aria-hidden="true">+</span>
            Nouvel agent
          </button>
        }
      />

      {/* Stats summary */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon green">
              <span aria-hidden="true">✓</span>
            </div>
          </div>
          <div className="stat-card-value">{agents.filter((a) => a.active).length}</div>
          <div className="stat-card-label">Agents actifs</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon red">
              <span aria-hidden="true">✕</span>
            </div>
          </div>
          <div className="stat-card-value">{agents.filter((a) => !a.active).length}</div>
          <div className="stat-card-label">Agents inactifs</div>
        </div>
      </div>

      <DataTable<Agent>
        columns={columns}
        data={agents}
        searchKeys={['code', 'full_name', 'phone']}
        searchPlaceholder="Rechercher un agent par nom, code ou téléphone..."
        idKey="id"
        emptyIcon="👤"
        emptyTitle="Aucun agent"
        emptyDesc="Créez votre premier agent pour commencer."
      />

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nouvel agent"
      >
        <ActionForm
          endpoint={`${apiBase}/agents`}
          buttonLabel="Créer l'agent"
          onSuccess={handleSuccess}
          fields={[
            {
              name: 'code',
              label: 'Code agent',
              placeholder: 'Ex: AGT-001',
              required: true,
            },
            {
              name: 'fullName',
              label: 'Nom complet',
              placeholder: 'Ex: Moussa Diallo',
              required: true,
            },
            {
              name: 'email',
              label: 'Email',
              placeholder: 'Ex: moussa@fifa-transport.tg',
              required: true,
              type: 'email',
            },
            {
              name: 'password',
              label: 'Mot de passe',
              placeholder: 'Créer un mot de passe',
              required: true,
              type: 'password',
            },
            {
              name: 'phone',
              label: 'Téléphone',
              placeholder: 'Ex: +221 77 123 4567',
            },
          ]}
        />
      </Modal>
    </>
  );
}
