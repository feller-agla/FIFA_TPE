const apiBase = process.env.ADMIN_API_BASE_URL ?? 'http://localhost:3000/api';

async function getDevices() {
  const response = await fetch(`${apiBase}/devices`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Impossible de charger les TPE');
  }
  return response.json();
}

export default async function DevicesPage() {
  const devices = await getDevices();

  return (
    <main className="container grid">
      <section className="header">
        <div className="brand">
          <h1>TPE</h1>
          <p>Chaque terminal est rattaché à un agent</p>
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
                <th>Device ID</th>
                <th>Libellé</th>
                <th>Agent</th>
                <th>Statut</th>
                <th>Créé</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device: any) => (
                <tr key={device.device_id}>
                  <td>{device.device_id}</td>
                  <td>{device.label}</td>
                  <td>{device.agent_name ?? device.agent_code ?? '-'}</td>
                  <td>{device.status}</td>
                  <td>{device.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
