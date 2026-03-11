import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import PackageDetailPage from './components/PackageDetailPage';
import Footer from './components/Footer';
import AgentDashboard from './components/AgentDashboard';
import ClientDashboard from './components/ClientDashboard';
import GoogleCallback from './pages/GoogleCallback';
import GoogleDone from './pages/GoogleDone';
import { userStore, tokenStore } from './api';
import { getAllActivePackages } from './components/agent/packages/services/packagesApi';

const BASE_URL = import.meta.env.VITE_API_URL;

// ── Normalise raw DB package → UI shape ──────────────────────────────────────
export const normalise = (pkg) => ({
  ...pkg,
  title:         pkg.name,
  originalPrice: Number(pkg.original_price ?? 0),
  hotelRating:   pkg.makkah_hotel_rating ? `${pkg.makkah_hotel_rating}★` : '',
  distance:      pkg.makkah_hotel_distance
    ? `${Number(pkg.makkah_hotel_distance).toLocaleString()}m from Haram`
    : '',
  image: (Array.isArray(pkg.image_urls) && pkg.image_urls[0])
    || 'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?auto=format&fit=crop&w=800&q=80',
  images: Array.isArray(pkg.image_urls) && pkg.image_urls.length
    ? pkg.image_urls
    : ['https://images.unsplash.com/photo-1564769662533-4f00a87b4056?auto=format&fit=crop&w=800&q=80'],
  price:      Number(pkg.price    ?? 0),
  duration:   Number(pkg.duration ?? 0),
  discount:   Number(pkg.discount ?? 0),
  rating:     Number(pkg.makkah_hotel_rating ?? 0),
  includes:   Array.isArray(pkg.inclusions) ? pkg.inclusions : [],
  excludes:   Array.isArray(pkg.exclusions) ? pkg.exclusions : [],
  highlights: Array.isArray(pkg.highlights) ? pkg.highlights : [],
});

// ── Silent token refresh ──────────────────────────────────────────────────────
// Called once on app load. If the stored token is expired or missing,
// uses the httpOnly refresh token cookie to get a new access token silently.
const initAuth = async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // sends httpOnly refresh cookie automatically
    });

    if (!res.ok) {
      // Refresh failed — clear any stale data so user gets a clean state
      tokenStore.clear();
      userStore.clear();
      return null;
    }

    const data = await res.json();
    const newToken = data.data?.accessToken || data.accessToken;
    const user     = data.data?.user        || data.user;

    if (newToken) tokenStore.set(newToken);
    if (user)     userStore.set(user);

    return user || userStore.get();
  } catch {
    // Network error or backend down — don't clear, just proceed unauthenticated
    return null;
  }
};

// ── Route guards ──────────────────────────────────────────────────────────────
const ProtectedAgentRoute = ({ children, authReady }) => {
  if (!authReady) return null; // wait for auth init before redirecting
  const user = userStore.get();
  if (!user || user.role !== 'agent') return <Navigate to="/" replace />;
  return children;
};

const ProtectedClientRoute = ({ children, authReady }) => {
  if (!authReady) return null;
  const user = userStore.get();
  if (!user || user.role !== 'client') return <Navigate to="/" replace />;
  return children;
};

// ─────────────────────────────────────────────────────────────────────────────
function App() {
  const [favorites,   setFavorites]   = useState([]);
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

  const toggleFavorite = (id) =>
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );

  const handleLogout = () => {
    tokenStore.clear();
    userStore.clear();
    setCurrentUser(null);
    window.location.href = '/';
  };

  // Show nothing until auth is initialized — prevents flash of wrong route
  if (!authReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Home */}
          <Route path="/" element={
            <>
              <Header currentUser={currentUser} />
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
            />
          } />

          <Route path="/agent/dashboard" element={
            <ProtectedAgentRoute authReady={authReady}>
              <AgentDashboard />
            </ProtectedAgentRoute>
          } />

          <Route path="/client/dashboard" element={
            <ProtectedClientRoute authReady={authReady}>
              <ClientDashboard user={currentUser} onLogout={handleLogout} />
            </ProtectedClientRoute>
          } />

          <Route path="/auth/google/callback" element={<GoogleCallback />} />
          <Route path="/auth/google/done"     element={<GoogleDone />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;