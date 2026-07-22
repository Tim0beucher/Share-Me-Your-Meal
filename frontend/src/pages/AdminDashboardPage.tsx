import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AdminReport, AdminStats, AdminUser } from '../api/types';
import { LineChart, LineChartPoint } from '../components/LineChart';

type Metric = 'pendingReports' | 'users' | 'recipes' | 'comments';

const METRIC_LABELS: Record<Metric, string> = {
  pendingReports: 'Signalements en attente',
  users: 'Nouveaux utilisateurs',
  recipes: 'Nouvelles recettes',
  comments: 'Nouveaux commentaires',
};

// "pendingReports" est un statut instantané (nombre de signalements non
// traités), pas une création : on trace plutôt les signalements créés dans
// le temps (endpoint "reports"), la tendance la plus proche et utile ici.
const METRIC_TO_API: Record<Metric, string> = {
  pendingReports: 'reports',
  users: 'users',
  recipes: 'recipes',
  comments: 'comments',
};

type Period = '24h' | '7d' | '14d' | '1m' | '3m' | '6m' | '1y' | 'all';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '24h', label: 'Dernières 24h' },
  { value: '7d', label: 'Semaine dernière' },
  { value: '14d', label: 'Deux semaines' },
  { value: '1m', label: '1 mois' },
  { value: '3m', label: '3 mois' },
  { value: '6m', label: '6 mois' },
  { value: '1y', label: '1 an' },
  { value: 'all', label: 'Tout' },
];

// Reflète la granularité choisie côté backend pour chaque période (voir
// FIXED_PERIODS dans admin.service.ts), pour formater les libellés de dates
// du graphique en conséquence (heure, jour ou mois).
const PERIOD_GRANULARITY: Record<Period, 'hour' | 'day' | 'week' | 'month'> = {
  '24h': 'hour',
  '7d': 'day',
  '14d': 'day',
  '1m': 'day',
  '3m': 'week',
  '6m': 'week',
  '1y': 'month',
  all: 'month',
};

const STATUS_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  traite: 'Traité',
  rejete: 'Rejeté',
};

const TARGET_LABELS: Record<string, string> = {
  recette: 'Recette',
  commentaire: 'Commentaire',
  aliment: 'Aliment',
  utilisateur: 'Utilisateur',
};

const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

export function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null);
  const [period, setPeriod] = useState<Period>('14d');
  const [chartData, setChartData] = useState<LineChartPoint[] | null>(null);

  const loadAll = () => {
    api.get<AdminStats>('/admin/stats').then(setStats);
    api.get<AdminReport[]>('/admin/reports').then(setReports);
    api.get<AdminUser[]>('/admin/users').then(setUsers);
  };

  useEffect(loadAll, []);

  useEffect(() => {
    if (!selectedMetric) return;
    setChartData(null);
    api
      .get<LineChartPoint[]>(`/admin/stats/timeseries?metric=${METRIC_TO_API[selectedMetric]}&period=${period}`)
      .then(setChartData);
  }, [selectedMetric, period]);

  const selectMetric = (metric: Metric) => {
    setSelectedMetric((prev) => (prev === metric ? null : metric));
  };

  const resolveReport = async (id: string, status: 'traite' | 'rejete') => {
    await api.patch(`/admin/reports/${id}`, { status });
    loadAll();
  };

  const hideComment = async (commentId: string) => {
    await api.patch(`/admin/comments/${commentId}/hide`, {});
    loadAll();
  };

  const toggleBan = async (user: AdminUser) => {
    const action = user.deleted_at ? 'unban' : 'ban';
    await api.patch(`/admin/users/${user.id}/${action}`, {});
    loadAll();
  };

  return (
    <div>
      <h1>Dashboard admin</h1>

      <div className="macro-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <button
          type="button"
          className={`macro-grid__item macro-grid__item--clickable${selectedMetric === 'pendingReports' ? ' macro-grid__item--active' : ''}`}
          onClick={() => selectMetric('pendingReports')}
        >
          <span className="macro-grid__value">{stats?.pendingReports ?? '—'}</span>
          <span className="macro-grid__label">Signalements en attente</span>
        </button>
        <button
          type="button"
          className={`macro-grid__item macro-grid__item--clickable${selectedMetric === 'users' ? ' macro-grid__item--active' : ''}`}
          onClick={() => selectMetric('users')}
        >
          <span className="macro-grid__value">{stats?.users ?? '—'}</span>
          <span className="macro-grid__label">Utilisateurs</span>
        </button>
        <button
          type="button"
          className={`macro-grid__item macro-grid__item--clickable${selectedMetric === 'recipes' ? ' macro-grid__item--active' : ''}`}
          onClick={() => selectMetric('recipes')}
        >
          <span className="macro-grid__value">{stats?.recipes ?? '—'}</span>
          <span className="macro-grid__label">Recettes</span>
        </button>
        <button
          type="button"
          className={`macro-grid__item macro-grid__item--clickable${selectedMetric === 'comments' ? ' macro-grid__item--active' : ''}`}
          onClick={() => selectMetric('comments')}
        >
          <span className="macro-grid__value">{stats?.comments ?? '—'}</span>
          <span className="macro-grid__label">Commentaires</span>
        </button>
      </div>

      {selectedMetric && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ margin: 0 }}>{METRIC_LABELS[selectedMetric]}</h2>
            <select value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {chartData === null ? (
            <p>Chargement...</p>
          ) : (
            <LineChart points={chartData} label={METRIC_LABELS[selectedMetric]} granularity={PERIOD_GRANULARITY[period]} />
          )}
        </div>
      )}

      <div className="card">
        <h2>Signalements</h2>
        {reports === null ? (
          <p>Chargement...</p>
        ) : reports.length === 0 ? (
          <p className="empty-state">Aucun signalement.</p>
        ) : (
          reports.map((r) => (
            <div key={r.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <span>
                  <strong>{TARGET_LABELS[r.target_type]}</strong> signalé par {r.reporter_pseudo} —{' '}
                  {DATE_FORMAT.format(new Date(r.created_at))}
                </span>
                <span
                  className="macro-pill"
                  style={
                    r.status === 'en_attente'
                      ? { color: 'var(--color-down)' }
                      : r.status === 'traite'
                        ? { color: 'var(--color-good)' }
                        : undefined
                  }
                >
                  {STATUS_LABELS[r.status]}
                </span>
              </div>
              <p style={{ margin: '6px 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                Motif : {r.reason}
              </p>
              {r.targetPreview && (
                <p style={{ margin: '6px 0', fontSize: '0.9rem', fontStyle: 'italic' }}>« {r.targetPreview} »</p>
              )}
              {r.status === 'en_attente' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {r.target_type === 'commentaire' && (
                    <button className="btn btn--ghost" onClick={() => hideComment(r.target_id)}>
                      Masquer le commentaire
                    </button>
                  )}
                  <button className="btn" onClick={() => resolveReport(r.id, 'traite')}>
                    Marquer traité
                  </button>
                  <button className="btn btn--ghost" onClick={() => resolveReport(r.id, 'rejete')}>
                    Rejeter
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h2>Utilisateurs</h2>
        {users === null ? (
          <p>Chargement...</p>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}
            >
              <span>
                <strong>{u.pseudo}</strong> · {u.email} · {u.role} · inscrit le{' '}
                {DATE_FORMAT.format(new Date(u.created_at))}
                {u.deleted_at && <span style={{ color: 'var(--color-down)' }}> · banni</span>}
              </span>
              <button className="btn btn--ghost" onClick={() => toggleBan(u)}>
                {u.deleted_at ? 'Débannir' : 'Bannir'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
