import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function RequireAdmin({ children }: { children: React.ReactElement }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}
