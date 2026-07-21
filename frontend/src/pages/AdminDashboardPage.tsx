import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AdminReport, AdminStats, AdminUser } from '../api/types';

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

  const loadAll = () => {
    api.get<AdminStats>('/admin/stats').then(setStats);
    api.get<AdminReport[]>('/admin/reports').then(setReports);
    api.get<AdminUser[]>('/admin/users').then(setUsers);
  };

  useEffect(loadAll, []);

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
        <div className="macro-grid__item">
          <span className="macro-grid__value">{stats?.pendingReports ?? '—'}</span>
          <span className="macro-grid__label">Signalements en attente</span>
        </div>
        <div className="macro-grid__item">
          <span className="macro-grid__value">{stats?.users ?? '—'}</span>
          <span className="macro-grid__label">Utilisateurs</span>
        </div>
        <div className="macro-grid__item">
          <span className="macro-grid__value">{stats?.recipes ?? '—'}</span>
          <span className="macro-grid__label">Recettes</span>
        </div>
        <div className="macro-grid__item">
          <span className="macro-grid__value">{stats?.comments ?? '—'}</span>
          <span className="macro-grid__label">Commentaires</span>
        </div>
      </div>

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
                <strong>{u.pseudo}</strong> · {u.email} · {u.role}
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
