import { ActionForm } from '@/components/ActionForm';

const apiBase = process.env.ADMIN_API_BASE_URL ?? 'http://localhost:3000/api';

async function getJson(path: string) {
  const response = await fetch(`${apiBase}${path}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Impossible de charger ${path}`);
  }
  return response.json();
}

export default async function HomePage() {
  const dashboard = await getJson('/dashboard');

  return (
    <main className="container grid" style={{ gap: 20 }}>
      <section className="header">
        <div className="brand">
          <h1>FIFA Admin</h1>
          <p>Gestion centrale des tickets, agents et TPE</p>
        </div>
        <nav className="nav">
          <a href="/">Dashboard</a>
          <a href="/agents">Agents</a>
          <a href="/devices">TPE</a>
          <a href="/tickets">Tickets</a>
        </nav>
      </section>

      <section className="grid cards">
        <div className="card">
          <div className="muted">Agents</div>
          <div className="stat">{dashboard.agents}</div>
        </div>
        <div className="card">
          <div className="muted">TPE enregistrés</div>
          <div className="stat">{dashboard.devices}</div>
        </div>
        <div className="card">
          <div className="muted">Tickets émis</div>
          <div className="stat">{dashboard.tickets}</div>
        </div>
      </section>

      <section className="card">
        <h2>Derniers tickets</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Référence</th>
                <th>Agent</th>
                <th>TPE</th>
                <th>Service</th>
                <th>Montant</th>
                <th>Mode</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.recentTickets.map((ticket: any) => (
                <tr key={ticket.id}>
                  <td>{ticket.reference}</td>
                  <td>{ticket.agent_name}</td>
                  <td>{ticket.device_label}</td>
                  <td>{ticket.service_type}</td>
                  <td>{ticket.amount} FCFA</td>
                  <td>{ticket.payment_mode}</td>
                  <td>{ticket.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid cards">
        <ActionForm
          title="Créer un agent"
          endpoint={`${apiBase}/agents`}
          buttonLabel="Créer l’agent"
          fields={[
            { name: 'code', placeholder: 'Code agent' },
            { name: 'fullName', placeholder: 'Nom complet' },
            { name: 'phone', placeholder: 'Téléphone' },
          ]}
        />
        <ActionForm
          title="Enregistrer un TPE"
          endpoint={`${apiBase}/devices`}
          buttonLabel="Enregistrer le TPE"
          fields={[
            { name: 'deviceId', placeholder: 'ID TPE' },
            { name: 'label', placeholder: 'Nom / libellé' },
            { name: 'agentId', placeholder: 'Agent ID', type: 'number' },
          ]}
        />
      </section>
    </main>
  );
}
