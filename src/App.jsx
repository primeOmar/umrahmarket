import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import PackageDetailPage from './components/PackageDetailPage';
import Footer from './components/Footer';
import AgentDashboard from './components/AgentDashboard';
import ClientDashboard from './components/ClientDashboard';
import SuperAdminLogin from './components/SuperAdminLogin';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import GoogleCallback from './pages/GoogleCallback';
import GoogleDone from './pages/GoogleDone';
import { refreshToken, userStore, tokenStore } from './api';
import PaymentCallback from './pages/PaymentCallback';
import { getAllActivePackages, toggleFavourite, getFavourites, normalise } from './components/agent/packages/services/packagesApi';
import SuperAdminRegister from './components/SuperAdminRegister';
// ── Silent token refresh ──────────────────────────────────────────────────────
// Called once on app load. Uses the refreshToken function from api.js
// so the URL is always kept in sync with the rest of the API layer.
const initAuth = async () => {
  try {
    const res = await refreshToken();
    const user = res?.data?.data?.user;
    if (user) userStore.set(user);
    return user || userStore.get();
  } catch {
    tokenStore.clear();
    userStore.clear();
    return null;
  }
};

// ── Route guards ──────────────────────────────────────────────────────────────
const ProtectedAgentRoute = ({ children, authReady }) => {
  const location = useLocation();
  if (!authReady) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="h-8 w-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  );
  const user = userStore.get();
  if (!user || user.role !== 'agent') return <Navigate to="/" state={{ from: location.pathname }} replace />;
  return children;
};

const ProtectedClientRoute = ({ children, authReady }) => {
  const location = useLocation();
  if (!authReady) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="h-8 w-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  );
  const user = userStore.get();
  if (!user || user.role !== 'client') return <Navigate to="/" state={{ from: location.pathname }} replace />;
  return children;
};

// ── Superadmin Route Protection ───────────────────────────────────────────────
const ProtectedSuperAdminRoute = ({ children, authReady }) => {
  const location = useLocation();
  if (!authReady) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="h-8 w-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
    </div>
  );
  const token = localStorage.getItem('superadmin_token');
  const user = localStorage.getItem('superadmin_user');
  if (!token || !user) return <Navigate to="/superadmin/login" state={{ from: location.pathname }} replace />;
  return children;
};

// ─────────────────────────────────────────────────────────────────────────────
function App() {
  const [favorites,   setFavorites]   = useState([]); // array of package IDs
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady,   setAuthReady]   = useState(false); // true once initAuth completes

  const [packages,   setPackages]   = useState([]);
  const [pkgLoading, setPkgLoading] = useState(true);
  const [pkgError,   setPkgError]   = useState(null);

  const fetchPackages = useCallback(async () => {
    setPkgLoading(true);
    setPkgError(null);
    try {
      const data = await getAllActivePackages();
      const list = Array.isArray(data) ? data : (data.packages ?? data.data ?? []);
      setPackages(list.map(normalise));
    } catch (err) {
      setPkgError(err.message || 'Failed to load packages.');
    } finally {
      setPkgLoading(false);
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      // 1. Silently refresh token — runs on every page load/refresh
      const refreshedUser = await initAuth();

      // 2. Use refreshed user, or fall back to what's in localStorage
      const user = refreshedUser || userStore.get();
      if (user) setCurrentUser(user);

      // 3. Mark auth as ready — protected routes can now evaluate
      setAuthReady(true);

      // 4. Fetch public packages
      fetchPackages();
    };

    bootstrap();
  }, [fetchPackages]);

  const toggleFavorite = async (id) => {
    const user = currentUser || userStore.get();
    if (!user) return; // HeroSection/PackageDetailPage show auth modal before calling this

    // Optimistic update — flip immediately in UI
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );

    try {
      await toggleFavourite(id);
    } catch {
      // Revert on failure
      setFavorites(prev =>
        prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
      );
    }
  };

  // Load favourites from DB whenever a user logs in
  useEffect(() => {
    const user = currentUser || userStore.get();
    if (!user) { setFavorites([]); return; }
    getFavourites()
      .then(data => setFavorites((data.packageIds ?? []).map(String)))
      .catch(() => {}); // silently ignore — not critical
  }, [currentUser]);

  const handleLogout = useCallback(() => {
    tokenStore.clear();
    userStore.clear();
    setCurrentUser(null);
    window.location.href = '/';
  }, []);

  // ── Listen for token expiry fired by api.js interceptor ──────────────────
  useEffect(() => {
    const onExpired = () => {
      tokenStore.clear();
      userStore.clear();
      setCurrentUser(null);
      // Redirect happens inside api.js after 2.5 s; we just sync React state here
    };
    window.addEventListener('session:expired', onExpired);
    return () => window.removeEventListener('session:expired', onExpired);
  }, []);

  // ── Inactivity timeout — log out after 30 min of no interaction ───────────
  useEffect(() => {
    const TIMEOUT = 30 * 60 * 1000; // 30 minutes
    let timer;

    const reset = () => {
      clearTimeout(timer);
      // Only start timer if a user is actually logged in
      if (userStore.get()) {
        timer = setTimeout(() => {
          handleLogout();
        }, TIMEOUT);
      }
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset(); // start on mount

    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [currentUser]); // restart timer when user changes

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Home */}
          <Route path="/" element={
            <>
              <Header
                currentUser={currentUser}
                onLogout={handleLogout}
                onAuthSuccess={(user) => {
                  setCurrentUser(user);
                  userStore.set(user);
                }}
              />
              <HeroSection
                packages={packages}
                loading={pkgLoading}
                error={pkgError}
                onRetry={fetchPackages}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
              />
              <Footer />
            </>
          } />

          {/* Detail */}
          <Route path="/package/:id" element={
            <PackageDetailPage
              packages={packages}
              loading={pkgLoading}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              currentUser={currentUser}
            />
          } />

          <Route path="/agent/dashboard" element={
            <ProtectedAgentRoute authReady={authReady}>
              <AgentDashboard user={currentUser} onLogout={handleLogout} />
            </ProtectedAgentRoute>
          } />

<Route path="/superadmin/register" element={<SuperAdminRegister />} />
          <Route path="/client/dashboard" element={
            <ProtectedClientRoute authReady={authReady}>
              <ClientDashboard user={currentUser} onLogout={handleLogout} packages={packages} />
            </ProtectedClientRoute>
          } />

          <Route path="/auth/google/callback" element={<GoogleCallback />} />
          <Route path="/auth/google/done"     element={<GoogleDone />} />

          {/* FIX: packageId is in the path so Pesapal can't stomp it on redirect */}
          <Route path="/payment/callback/:packageId" element={<PaymentCallback />} />

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* SUPERADMIN ROUTES - Restricted Access                             */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          <Route path="/superadmin/login" element={<SuperAdminLogin />} />
          
          <Route path="/superadmin/dashboard" element={
            <ProtectedSuperAdminRoute authReady={authReady}>
              <SuperAdminDashboard />
            </ProtectedSuperAdminRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;