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
import { userStore } from './api';
import { getAllActivePackages } from './components/agent/packages/services/packagesApi';

// ── Normalise raw DB package → UI shape ──────────────────────────────────────
// Single source of truth — imported by nothing else, lives here since App owns the data.
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

// ── Route guards ──────────────────────────────────────────────────────────────
const ProtectedAgentRoute = ({ children }) => {
  const user = userStore.get();
  if (!user || user.role !== 'agent') return <Navigate to="/" replace />;
  return children;
};

const ProtectedClientRoute = ({ children }) => {
  const user = userStore.get();
  if (!user || user.role !== 'client') return <Navigate to="/" replace />;
  return children;
};

// ─────────────────────────────────────────────────────────────────────────────
function App() {
  const [favorites,   setFavorites]   = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // ── Single fetch — shared by HeroSection AND PackageDetailPage ─────────────
  const [packages,  setPackages]  = useState([]);
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
    const user = userStore.get();
    if (user) setCurrentUser(user);
    fetchPackages();
  }, [fetchPackages]);

  const toggleFavorite = (id) =>
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );

  const handleLogout = () => {
    userStore.clear();
    setCurrentUser(null);
    window.location.href = '/';
  };

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

          {/* Detail — receives the same already-fetched list, no second API call */}
          <Route path="/package/:id" element={
            <PackageDetailPage
              packages={packages}
              loading={pkgLoading}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
            />
          } />

          <Route path="/agent/dashboard" element={
            <ProtectedAgentRoute><AgentDashboard /></ProtectedAgentRoute>
          } />
          <Route path="/client/dashboard" element={
            <ProtectedClientRoute>
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