import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api } from '../api/client';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 380, margin: '40px auto' }}>
      <h1>Mot de passe oublié</h1>
      {error && <div className="error-banner">{error}</div>}

      {sent ? (
        <>
          <p>Si un compte existe avec cette adresse, un lien de réinitialisation vient d'être envoyé.</p>
          <p style={{ fontSize: '0.85rem' }}>
            <Link to="/login">Retour à la connexion</Link>
          </p>
        </>
      ) : (
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button className="btn" type="submit" disabled={loading || !email.trim()}>
            {loading ? 'Envoi...' : 'Envoyer le lien de réinitialisation'}
          </button>
        </form>
      )}
    </div>
  );
}
