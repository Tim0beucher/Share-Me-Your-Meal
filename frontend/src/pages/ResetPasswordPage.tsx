import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError, api } from '../api/client';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="card" style={{ maxWidth: 380, margin: '40px auto' }}>
        <h1>Lien invalide</h1>
        <p>Ce lien de réinitialisation est incomplet.</p>
        <p style={{ fontSize: '0.85rem' }}>
          <Link to="/mot-de-passe-oublie">Demander un nouveau lien</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 380, margin: '40px auto' }}>
      <h1>Nouveau mot de passe</h1>
      {error && <div className="error-banner">{error}</div>}

      {done ? (
        <p>Mot de passe mis à jour. Redirection vers la connexion...</p>
      ) : (
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="newPassword">Nouveau mot de passe (8 caractères min.)</label>
            <input
              id="newPassword"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Mise à jour...' : 'Réinitialiser le mot de passe'}
          </button>
        </form>
      )}
    </div>
  );
}
