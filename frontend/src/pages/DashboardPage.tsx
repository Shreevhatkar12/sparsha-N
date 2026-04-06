import { useEffect, useState } from 'react';
import { studentsApi } from '../api/studentsApi';
import type { DashboardStats } from '../types/api';

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setError('');
        const data = await studentsApi.dashboard();
        setStats(data);
      } catch {
        setError('Could not load dashboard metrics.');
      }
    };
    void load();
  }, []);

  const cards = [
    { label: 'Total Students', value: String(stats?.totalStudents ?? '--') },
    { label: 'Active Students', value: String(stats?.activeStudents ?? '--') },
    { label: 'Attendance Rate', value: stats?.attendanceRate ? `${stats.attendanceRate}%` : '--' },
  ];

  return (
    <>
      <section className="hero-panel">
        <p className="kicker">Live metrics</p>
        <h1>Dashboard</h1>
        <p className="hero-copy">
          Real-time education outcomes, connected to backend dashboard APIs.
        </p>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="stats-grid" aria-label="Impact statistics">
        {cards.map((card) => (
          <article key={card.label} className="card">
            <p className="card-label">{card.label}</p>
            <p className="card-value">{card.value}</p>
            <p className="card-trend">Synced from backend</p>
          </article>
        ))}
      </section>
    </>
  );
}
