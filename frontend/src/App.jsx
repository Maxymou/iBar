import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { ThemeProvider } from './store/ThemeContext';

import LoginPage from './components/user/LoginPage';
import RegisterPage from './components/user/RegisterPage';
import UserDrawer from './components/user/UserDrawer';

const RestaurantsPage    = lazy(() => import('./components/restaurants/RestaurantsPage'));
const RestaurantDetail   = lazy(() => import('./components/restaurants/RestaurantDetail'));
const AccommodationsPage = lazy(() => import('./components/accommodations/AccommodationsPage'));
const AccommodationDetail = lazy(() => import('./components/accommodations/AccommodationDetail'));

const PageSpinner = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

// Protected layout with header + bottom nav
const AppLayout = () => {
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // Hide bottom nav on detail pages
  const isDetailPage = location.pathname.includes('/restaurants/') ||
                       location.pathname.includes('/hebergements/');

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 dark:bg-gray-900"
         style={{ height: '100dvh' }}>
      {/* Top Header */}
      {!isDetailPage && (
        <header className="top-header">
          {/* Avatar / Drawer toggle */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden"
          >
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary-700 font-bold text-lg">
                {user.name?.charAt(0).toUpperCase()}
              </span>
            )}
          </button>

          {/* App title */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍸</span>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">IBar</h1>
          </div>

          {/* Placeholder for balance */}
          <div className="w-10" />
        </header>
      )}

      {/* Main Content */}
      <main
        className="flex-1 overflow-hidden"
        style={{
          marginTop:    isDetailPage ? 0 : `calc(56px + env(safe-area-inset-top))`,
          marginBottom: isDetailPage ? 0 : `calc(56px + env(safe-area-inset-bottom))`,
        }}
      >
        <Suspense fallback={<PageSpinner />}>
          <Routes>
            <Route path="/" element={<Navigate to="/restaurants" replace />} />
            <Route path="/restaurants" element={<RestaurantsPage />} />
            <Route path="/restaurants/:id" element={<RestaurantDetail />} />
            <Route path="/hebergements" element={<AccommodationsPage />} />
            <Route path="/hebergements/:id" element={<AccommodationDetail />} />
          </Routes>
        </Suspense>
      </main>

      {/* Bottom Navigation */}
      {!isDetailPage && (
        <nav className="bottom-nav">
          <TabItem to="/restaurants" icon="🍽️" label="Restaurants" />
          <TabItem to="/hebergements" icon="🏨" label="Hébergements" />
        </nav>
      )}

      {/* User Drawer */}
      <UserDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
};

const TabItem = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex flex-col items-center gap-0.5 px-6 py-2 rounded-2xl transition-all
       ${isActive ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30' : 'text-gray-400 dark:text-gray-500'}`
    }
  >
    <span className="text-xl">{icon}</span>
    <span className="text-xs font-medium">{label}</span>
  </NavLink>
);

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

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (user) return <Navigate to="/" replace />;
  return children;
};

export default App;
