const apiBase = process.env.ADMIN_API_BASE_URL ?? 'http://localhost:3000/api';

async function getTickets() {
  const response = await fetch(`${apiBase}/tickets`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Impossible de charger les tickets');
  }
  return response.json();
}

export default async function TicketsPage() {
  const tickets = await getTickets();

  return (
    <main className="container grid">
      <section className="header">
        <div className="brand">
          <h1>Tickets</h1>
          <p>Traçabilité complète des tickets émis par les TPE</p>
        </div>
        <nav className="nav">
          <a href="/">Dashboard</a>
          <a href="/agents">Agents</a>
          <a href="/devices">TPE</a>
          <a href="/tickets">Tickets</a>
        </nav>
      </section>

      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Référence</th>
                <th>Agent</th>
                <th>TPE</th>
                <th>Service</th>
                <th>Route</th>
                <th>Montant</th>
                <th>Mode</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket: any) => (
                <tr key={ticket.id}>
                  <td>{ticket.reference}</td>
                  <td>{ticket.agent_name}</td>
                  <td>{ticket.device_label}</td>
                  <td>{ticket.service_type}</td>
                  <td>{ticket.route}</td>
                  <td>{ticket.amount} FCFA</td>
                  <td>{ticket.payment_mode}</td>
                  <td>{ticket.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
