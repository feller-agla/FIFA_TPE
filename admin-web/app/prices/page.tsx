"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { ActionForm } from '@/components/ActionForm';

const apiBase = process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL ?? '/api';

type Price = {
  id: string;
  label: string;
  amount: number;
  updated_at: string;
};

type Ticket = {
  id: number;
  reference: string;
  device_id: string;
  agent_id: number;
  agent_name: string | null;
  agent_code: string | null;
  device_label: string | null;
  service_type: string;
  route: string;
  amount: number;
  payment_mode: string;
  created_at: string;
};

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount);
}

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

export default function PricesPage() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modals state
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState<Price | null>(null);

  // Report filters state
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  
  // Date states initialized dynamically
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(2026);

  // Initialize date defaults
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
    setSelectedMonth(`${yyyy}-${mm}`);
    setSelectedYear(yyyy);

    // Calculate current ISO week
    const tempDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const dayNum = tempDate.getUTCDay() || 7;
    tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((tempDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    setSelectedWeek(`${tempDate.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [pricesRes, ticketsRes] = await Promise.all([
        fetch(`${apiBase}/prices`, { cache: 'no-store' }),
        fetch(`${apiBase}/tickets`, { cache: 'no-store' })
      ]);

      if (!pricesRes.ok) throw new Error('Impossible de charger les tarifs');
      if (!ticketsRes.ok) throw new Error('Impossible de charger les tickets');

      const pricesData = await pricesRes.json();
      const ticketsData = await ticketsRes.json();

      setPrices(pricesData);
      setTickets(ticketsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEditSuccess = useCallback(() => {
    setShowEditModal(false);
    setSelectedPrice(null);
    fetchData();
  }, [fetchData]);

  // Compute report data based on active period type & select options
  const reportData = useMemo(() => {
    if (!tickets || tickets.length === 0) {
      return {
        tickets: [],
        totalRevenue: 0,
        totalTickets: 0,
        averageAmount: 0,
        services: [],
        periodLabel: 'Aucune donnée disponible'
      };
    }

    let filtered = [...tickets];
    let periodLabel = '';

    if (reportPeriod === 'daily') {
      if (selectedDate) {
        filtered = tickets.filter(t => t.created_at.startsWith(selectedDate));
        const dateObj = new Date(selectedDate);
        periodLabel = `Journée du ${dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;
      } else {
        periodLabel = 'Journée non spécifiée';
      }
    } else if (reportPeriod === 'weekly') {
      if (selectedWeek) {
        const [yearStr, weekStr] = selectedWeek.split('-W');
        const year = parseInt(yearStr);
        const week = parseInt(weekStr);

        // Get simple week date start
        const getWeekStartDate = (w: number, y: number) => {
          const simple = new Date(y, 0, 1 + (w - 1) * 7);
          const dow = simple.getDay();
          const ISOweekStart = simple;
          if (dow <= 4) {
            ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
          } else {
            ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
          }
          return ISOweekStart;
        };

        const startDate = getWeekStartDate(week, year);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);

        filtered = tickets.filter(t => {
          const d = new Date(t.created_at);
          return d >= startDate && d < endDate;
        });

        const endLabelDate = new Date(startDate);
        endLabelDate.setDate(startDate.getDate() + 6);
        periodLabel = `Semaine du ${startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${endLabelDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
      } else {
        periodLabel = 'Semaine non spécifiée';
      }
    } else if (reportPeriod === 'monthly') {
      if (selectedMonth) {
        filtered = tickets.filter(t => t.created_at.startsWith(selectedMonth));
        const [year, month] = selectedMonth.split('-');
        const monthIndex = parseInt(month) - 1;
        const dateObj = new Date(parseInt(year), monthIndex, 1);
        periodLabel = `Mois de ${dateObj.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
      } else {
        periodLabel = 'Mois non spécifié';
      }
    } else if (reportPeriod === 'yearly') {
      const target = String(selectedYear);
      filtered = tickets.filter(t => t.created_at.startsWith(target));
      periodLabel = `Année ${selectedYear}`;
    }

    const totalTickets = filtered.length;
    const totalRevenue = filtered.reduce((sum, t) => sum + t.amount, 0);
    const averageAmount = totalTickets > 0 ? Math.round(totalRevenue / totalTickets) : 0;

    // Breakdown by services
    const passagerTickets = filtered.filter(t => t.service_type === 'PASSAGER');
    const colisTickets = filtered.filter(t => t.service_type === 'COLIS');

    const passagerRevenue = passagerTickets.reduce((sum, t) => sum + t.amount, 0);
    const colisRevenue = colisTickets.reduce((sum, t) => sum + t.amount, 0);

    const services = [
      {
        name: 'PASSAGER',
        count: passagerTickets.length,
        revenue: passagerRevenue,
        percentage: totalRevenue > 0 ? Math.round((passagerRevenue / totalRevenue) * 100) : 0
      },
      {
        name: 'COLIS',
        count: colisTickets.length,
        revenue: colisRevenue,
        percentage: totalRevenue > 0 ? Math.round((colisRevenue / totalRevenue) * 100) : 0
      }
    ];

    return {
      tickets: filtered,
      totalRevenue,
      totalTickets,
      averageAmount,
      services,
      periodLabel
    };
  }, [tickets, reportPeriod, selectedDate, selectedWeek, selectedMonth, selectedYear]);

  // Handle printing PDF
  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Veuillez autoriser les fenêtres surgissantes (popups) pour imprimer le bilan.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <title>Bilan Financier - ${reportData.periodLabel}</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #1A1A1A;
              margin: 0;
              padding: 40px;
              background: #FFFFFF;
              font-size: 14px;
              line-height: 1.5;
            }
            .header-report {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 3px solid #F5C518;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo-report {
              font-size: 24px;
              font-weight: 800;
              color: #0A0A0A;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .logo-report span {
              color: #F5C518;
            }
            .title-report {
              text-align: right;
            }
            .title-report h1 {
              margin: 0;
              font-size: 20px;
              text-transform: uppercase;
              color: #0A0A0A;
              font-weight: 800;
            }
            .title-report p {
              margin: 5px 0 0;
              color: #666666;
              font-size: 14px;
              font-weight: 500;
            }
            .stats-grid-report {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-bottom: 35px;
            }
            .stat-card-report {
              border: 1px solid #E2E8F0;
              border-radius: 8px;
              padding: 16px;
              background: #F8FAFC;
              text-align: center;
            }
            .stat-card-val {
              font-size: 20px;
              font-weight: 700;
              color: #0F172A;
              margin-bottom: 4px;
            }
            .stat-card-lbl {
              font-size: 11px;
              color: #64748B;
              text-transform: uppercase;
              font-weight: 600;
              letter-spacing: 0.5px;
            }
            .section-title {
              font-size: 15px;
              font-weight: 700;
              margin: 25px 0 12px;
              color: #0F172A;
              border-left: 4px solid #F5C518;
              padding-left: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 25px;
            }
            th, td {
              padding: 10px 12px;
              text-align: left;
              border-bottom: 1px solid #E2E8F0;
            }
            th {
              background-color: #F1F5F9;
              color: #475569;
              font-weight: 700;
              font-size: 12px;
              text-transform: uppercase;
            }
            td {
              color: #334155;
            }
            td strong {
              color: #0F172A;
            }
            .text-right {
              text-align: right;
            }
            .badge-report {
              display: inline-block;
              padding: 3px 8px;
              font-size: 11px;
              font-weight: 600;
              border-radius: 4px;
              background: #F1F5F9;
              color: #475569;
              text-transform: uppercase;
            }
            .badge-success {
              background: #DCFCE7;
              color: #15803D;
            }
            .footer-report {
              margin-top: 60px;
              text-align: center;
              font-size: 11px;
              color: #94A3B8;
              border-top: 1px solid #E2E8F0;
              padding-top: 15px;
            }
            @media print {
              body { padding: 0; }
              @page { size: A4; margin: 1.5cm; }
            }
          </style>
        </head>
        <body>
          <div class="header-report">
            <div class="logo-report">FIFA <span>Transport</span></div>
            <div class="title-report">
              <h1>Bilan de Revenus</h1>
              <p>${reportData.periodLabel}</p>
            </div>
          </div>

          <div class="stats-grid-report">
            <div class="stat-card-report">
              <div class="stat-card-val">${formatAmount(reportData.totalRevenue)} FCFA</div>
              <div class="stat-card-lbl">Chiffre d'Affaires</div>
            </div>
            <div class="stat-card-report">
              <div class="stat-card-val">${reportData.totalTickets}</div>
              <div class="stat-card-lbl">Tickets Émis</div>
            </div>
            <div class="stat-card-report">
              <div class="stat-card-val">${formatAmount(reportData.averageAmount)} FCFA</div>
              <div class="stat-card-lbl">Panier Moyen</div>
            </div>
          </div>

          <div class="section-title">Répartition par Type de Service</div>
          <table>
            <thead>
              <tr>
                <th>Type de Service</th>
                <th>Nombre de Tickets</th>
                <th>Revenus Générés</th>
                <th class="text-right">Part du Chiffre d'Affaires</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.services.map(s => `
                <tr>
                  <td><strong>${s.name}</strong></td>
                  <td>${s.count}</td>
                  <td>${formatAmount(s.revenue)} FCFA</td>
                  <td class="text-right"><strong>${s.percentage}%</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="section-title">Liste des Transactions de la Période</div>
          <table>
            <thead>
              <tr>
                <th>Référence</th>
                <th>Agent</th>
                <th>Trajet</th>
                <th>Montant</th>
                <th>Paiement</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.tickets.length === 0 ? `
                <tr>
                  <td colspan="6" style="text-align: center; color: #94A3B8;">Aucune transaction enregistrée</td>
                </tr>
              ` : reportData.tickets.map(t => `
                <tr>
                  <td style="font-family: monospace; font-size: 12px; font-weight: 600;">${t.reference}</td>
                  <td>${t.agent_name || '—'} (${t.agent_code || '—'})</td>
                  <td>${t.route}</td>
                  <td><strong>${formatAmount(t.amount)} FCFA</strong></td>
                  <td><span class="badge-report ${t.payment_mode === 'cash' || t.payment_mode === 'espèces' ? 'badge-success' : ''}">${t.payment_mode}</span></td>
                  <td>${formatDate(t.created_at)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer-report">
            FIFA Transport Administration Console • Document officiel généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')} • Page 1
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 800);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <>
        <PageHeader
          icon="💵"
          title="Tarifs & Bilans"
          subtitle="Gestion des prix de services et bilans financiers"
          breadcrumb={[
            { label: 'Dashboard', href: '/' },
            { label: 'Tarifs & Bilans' },
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
          icon="💵"
          title="Tarifs & Bilans"
          subtitle="Gestion des prix de services et bilans financiers"
          breadcrumb={[
            { label: 'Dashboard', href: '/' },
            { label: 'Tarifs & Bilans' },
          ]}
        />
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">⚠️</div>
            <div className="empty-state-title">Erreur de chargement</div>
            <div className="empty-state-desc">{error}</div>
            <button className="btn btn-primary mt-md" onClick={fetchData} type="button">
              Réessayer
            </button>
          </div>
        </div>
      </>
    );
  }

  const yearsOptions = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 3; y--) {
    yearsOptions.push(y);
  }

  return (
    <>
      <PageHeader
        icon="💵"
        title="Tarifs & Bilans"
        subtitle="Mise à jour des grilles de tarifs et téléchargement des bilans financiers"
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Tarifs & Bilans' },
        ]}
      />

      <div className="section-grid">
        {/* Card 1: Prices Grid */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-left">
              <span className="card-header-icon" aria-hidden="true">🏷️</span>
              <div>
                <h2 className="card-title">Grille des Tarifs Actuels</h2>
                <p className="card-subtitle">Modifier les montants des offres passager et colis</p>
              </div>
            </div>
          </div>
          <div className="card-body-flush">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Offre de Service</th>
                    <th>Identifiant</th>
                    <th>Montant</th>
                    <th>Dernière modification</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.label}</strong>
                      </td>
                      <td>
                        <span className="cell-mono">{p.id}</span>
                      </td>
                      <td>
                        <span className="cell-amount">{formatAmount(p.amount)} FCFA</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {formatDate(p.updated_at)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-ghost"
                          onClick={() => {
                            setSelectedPrice(p);
                            setShowEditModal(true);
                          }}
                          type="button"
                          style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                        >
                          ✏️ Modifier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Card 2: PDF Revenue Report Generator */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-left">
              <span className="card-header-icon" aria-hidden="true">📊</span>
              <div>
                <h2 className="card-title">Télécharger un Bilan PDF</h2>
                <p className="card-subtitle">Générer les rapports de revenus journaliers, hebdomadaires, mensuels ou annuels</p>
              </div>
            </div>
          </div>
          
          <div className="card-body">
            {/* Period Selector Tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 18, background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((period) => (
                <button
                  key={period}
                  className={`btn ${reportPeriod === period ? 'btn-primary' : 'btn-ghost'}`}
                  style={{
                    flex: 1,
                    fontSize: '0.82rem',
                    padding: '8px 10px',
                    minWidth: 0,
                    textTransform: 'capitalize',
                    background: reportPeriod === period ? '' : 'transparent',
                    border: 'none'
                  }}
                  onClick={() => setReportPeriod(period)}
                  type="button"
                >
                  {period === 'daily' && 'Journalier'}
                  {period === 'weekly' && 'Hebdomadaire'}
                  {period === 'monthly' && 'Mensuel'}
                  {period === 'yearly' && 'Annuel'}
                </button>
              ))}
            </div>

            {/* Inputs based on selection */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ marginBottom: 8, fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block' }}>
                Choisir la période de facturation :
              </label>

              {reportPeriod === 'daily' && (
                <input
                  type="date"
                  className="form-input"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ width: '100%' }}
                />
              )}

              {reportPeriod === 'weekly' && (
                <input
                  type="week"
                  className="form-input"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  style={{ width: '100%' }}
                />
              )}

              {reportPeriod === 'monthly' && (
                <input
                  type="month"
                  className="form-input"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{ width: '100%' }}
                />
              )}

              {reportPeriod === 'yearly' && (
                <select
                  className="form-input"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                >
                  {yearsOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Live Preview summary inside container */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Aperçu du Bilan</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600 }}>{reportData.periodLabel}</span>
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, background: 'rgba(255, 255, 255, 0.02)', padding: '10px 12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>{formatAmount(reportData.totalRevenue)} F</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Revenus</div>
                </div>
                <div style={{ flex: 1, background: 'rgba(255, 255, 255, 0.02)', padding: '10px 12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>{reportData.totalTickets}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tickets</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {reportData.services.map((s) => (
                  <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Service {s.name} :</span>
                    <strong>{formatAmount(s.revenue)} FCFA ({s.count} tix — {s.percentage}%)</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Download Button */}
            <button
              className="btn btn-primary w-full"
              onClick={handleDownloadPDF}
              type="button"
              style={{ padding: '12px 24px', fontWeight: 600 }}
            >
              📥 Télécharger le Bilan PDF
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedPrice(null);
        }}
        title={selectedPrice ? `Modifier le tarif: ${selectedPrice.label}` : 'Modifier le tarif'}
      >
        {selectedPrice && (
          <ActionForm
            endpoint={`${apiBase}/prices/${selectedPrice.id}`}
            method="PATCH"
            buttonLabel="Enregistrer le tarif"
            onSuccess={handleEditSuccess}
            fields={[
              {
                name: 'amount',
                label: 'Montant (FCFA)',
                type: 'number',
                required: true,
                initialValue: selectedPrice.amount,
                placeholder: 'Saisir le nouveau prix en FCFA'
              }
            ]}
          />
        )}
      </Modal>
    </>
  );
}
