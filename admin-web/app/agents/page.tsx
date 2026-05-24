const apiBase = process.env.ADMIN_API_BASE_URL ?? 'http://localhost:3000/api';

async function getAgents() {
  const response = await fetch(`${apiBase}/agents`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Impossible de charger les agents');
  }
  return response.json();
}

export default async function AgentsPage() {
  const agents = await getAgents();

  return (
    <main className="container grid">
      <section className="header">
        <div className="brand">
          <h1>Agents</h1>
          <p>Comptes contrôlés par l’administration</p>
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
                <th>ID</th>
                <th>Code</th>
                <th>Nom</th>
                <th>Téléphone</th>
                <th>Actif</th>
                <th>Créé</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent: any) => (
                <tr key={agent.id}>
                  <td>{agent.id}</td>
                  <td>{agent.code}</td>
                  <td>{agent.full_name}</td>
                  <td>{agent.phone ?? '-'}</td>
                  <td>{agent.active ? 'Oui' : 'Non'}</td>
                  <td>{agent.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
