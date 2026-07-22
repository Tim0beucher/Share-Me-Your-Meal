import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireAdmin } from './auth/RequireAdmin';
import { RequireAuth } from './auth/RequireAuth';
import { useAuth } from './auth/AuthContext';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { CreateRecipePage } from './pages/CreateRecipePage';
import { DashboardPage } from './pages/DashboardPage';
import { EditRecipePage } from './pages/EditRecipePage';
import { FeedPage } from './pages/FeedPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LegalNoticePage } from './pages/LegalNoticePage';
import { LoginPage } from './pages/LoginPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { ProfilePage } from './pages/ProfilePage';
import { RecipeDetailPage } from './pages/RecipeDetailPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

export function App() {
  const { user } = useAuth();

  return (
    <Layout>
      <Routes>
        <Route path="/" element={user ? <DashboardPage /> : <FeedPage />} />
        <Route path="/recettes" element={<FeedPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
        <Route path="/reinitialiser-mot-de-passe" element={<ResetPasswordPage />} />
        <Route path="/mentions-legales" element={<LegalNoticePage />} />
        <Route path="/confidentialite" element={<PrivacyPolicyPage />} />
        <Route path="/recipes/:id" element={<RecipeDetailPage />} />
        <Route
          path="/recipes/new"
          element={
            <RequireAuth>
              <CreateRecipePage />
            </RequireAuth>
          }
        />
        <Route
          path="/recipes/:id/edit"
          element={
            <RequireAuth>
              <EditRecipePage />
            </RequireAuth>
          }
        />
        <Route
          path="/profil"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminDashboardPage />
            </RequireAdmin>
          }
        />
      </Routes>
    </Layout>
  );
}
