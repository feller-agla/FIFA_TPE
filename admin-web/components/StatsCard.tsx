type StatsCardProps = {
  icon: string;
  label: string;
  value: number;
  color?: 'yellow' | 'green' | 'blue' | 'red';
  trend?: { value: string; direction: 'up' | 'down' };
};

export function StatsCard({ icon, label, value, color = 'yellow', trend }: StatsCardProps) {
  return (
    <div className="stat-card" id={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="stat-card-header">
        <div className={`stat-card-icon ${color}`}>
          <span aria-hidden="true">{icon}</span>
        </div>
        {trend && (
          <div className={`stat-card-trend ${trend.direction}`}>
            <span aria-hidden="true">{trend.direction === 'up' ? '↑' : '↓'}</span>
            {trend.value}
          </div>
        )}
      </div>
      <div className="stat-card-value">{value.toLocaleString('fr-FR')}</div>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-glow" aria-hidden="true" />
    </div>
  );
}
