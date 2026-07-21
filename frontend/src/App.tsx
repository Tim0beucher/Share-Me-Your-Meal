import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireAdmin } from './auth/RequireAdmin';
import { RequireAuth } from './auth/RequireAuth';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { CreateRecipePage } from './pages/CreateRecipePage';
import { FeedPage } from './pages/FeedPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { RecipeDetailPage } from './pages/RecipeDetailPage';
import { RegisterPage } from './pages/RegisterPage';

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
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
