import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { ThemeProvider } from './store/ThemeContext';

import LoginPage from './components/user/LoginPage';
import RegisterPage from './components/user/RegisterPage';
import UserDrawer from './components/user/UserDrawer';
import ExplorePage from './components/explore/ExplorePage';

const PlaceDetailPage = lazy(() => import('./components/explore/PlaceDetailPage'));

const PageSpinner = () => (
  <div className="flex items-center justify-center h-full">
    <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

// Map-first layout: full screen map with overlays
const AppLayout = () => {
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="h-full w-full overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          <Route path="/places/:id" element={<PlaceDetailPage />} />
          <Route path="*" element={<ExplorePage onUserClick={() => setDrawerOpen(true)} />} />
        </Routes>
      </Suspense>
      <UserDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center" style={{ minHeight: '100dvh' }}>
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (user) return <Navigate to="/" replace />;
  return children;
};

const App = () => (
  <ThemeProvider>
  <BrowserRouter>
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  </BrowserRouter>
  </ThemeProvider>
);

export default App;
