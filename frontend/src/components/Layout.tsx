import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <nav className="nav">
        <Link to="/" className="nav__brand">
          Recette
        </Link>
        <div className="nav__links">
          {user ? (
            <>
              <Link to="/recipes/new">Créer une recette</Link>
              {user.role === 'admin' && <Link to="/admin">Dashboard</Link>}
              <Link to="/profil">{user.pseudo}</Link>
              <button
                className="btn btn--ghost"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Connexion</Link>
              <Link to="/register">Créer un compte</Link>
            </>
          )}
        </div>
      </nav>
      <div className="container">{children}</div>
    </>
  );
}
