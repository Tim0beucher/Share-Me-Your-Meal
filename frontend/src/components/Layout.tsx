import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <nav className="nav">
        <Link to="/" className="nav__brand">
          <span>Share Me</span>
          <span>
            Your Meal
            <span className="nav__brand-dot" />
          </span>
        </Link>
        <div className="nav__links">
          {user ? (
            <>
              <Link to="/recettes">Feed</Link>
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
      <footer className="footer">
        <Link to="/mentions-legales">Mentions légales</Link>
        <Link to="/confidentialite">Confidentialité</Link>
      </footer>
    </>
  );
}
