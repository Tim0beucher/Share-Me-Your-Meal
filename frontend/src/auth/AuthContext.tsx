import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import { AuthResult, UserProfile } from '../api/types';
import { applyAccent, resetAccent } from '../theme';

interface AuthContextValue {
  user: AuthResult['user'] | null;
  login: (result: AuthResult) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): AuthResult['user'] | null {
  const raw = localStorage.getItem('user');
  return raw ? (JSON.parse(raw) as AuthResult['user']) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthResult['user'] | null>(readStoredUser);

  // Recharge la couleur d'accent enregistrée sur le profil à chaque
  // (re)connexion — le cache local (theme.ts) ne fait qu'éviter un flash
  // avant que cette requête n'ait répondu. Rafraîchit aussi le rôle affiché
  // (utilisé pour montrer/cacher le lien Dashboard) : la comparaison évite
  // de redéclencher cet effet en boucle via le changement de `user`.
  useEffect(() => {
    if (!user) return;
    api
      .get<UserProfile>('/me')
      .then((profile) => {
        if (profile.accent_color) applyAccent(profile.accent_color);
        if (profile.role !== user.role) {
          const updated = { ...user, role: profile.role };
          localStorage.setItem('user', JSON.stringify(updated));
          setUser(updated);
        }
      })
      .catch(() => {});
  }, [user]);

  const login = (result: AuthResult) => {
    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('user', JSON.stringify(result.user));
    setUser(result.user);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setUser(null);
    resetAccent();
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
}
