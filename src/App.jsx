import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import PackageDetailPage from './components/PackageDetailPage';
import Footer from './components/Footer';
import { packages } from './data/packages';
import AgentDashboard from './components/AgentDashboard';
import ClientDashboard from './components/ClientDashboard';
import GoogleCallback from './pages/GoogleCallback';
import { userStore } from './api';
import GoogleDone     from './pages/GoogleDone';
// Protected Route Component - redirects to home if not authenticated as agent
const ProtectedAgentRoute = ({ children }) => {
  const user = userStore.get();
  
  // Check if user exists and is an agent
  if (!user || user.role !== 'agent') {
    console.warn('Access denied: User is not an authenticated agent');
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Protected Route Component - redirects to home if not authenticated as client
const ProtectedClientRoute = ({ children }) => {
  const user = userStore.get();
  
  // Check if user exists and is a client
  if (!user || user.role !== 'client') {
    console.warn('Access denied: User is not an authenticated client');
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  const [filteredPackages, setFilteredPackages] = useState(packages);
  const [favorites, setFavorites] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Check authentication on mount and when location changes
  useEffect(() => {
    const user = userStore.get();
    if (user) {
      setCurrentUser(user);
      console.log('Current user (from userStore):', user);
    }
  }, []);

  // Initialize with all packages
  useEffect(() => {
    setFilteredPackages(packages);
  }, []);

  const toggleFavorite = (id) => {
    setFavorites(prev =>
      prev.includes(id)
        ? prev.filter(favId => favId !== id)
        : [...prev, id]
    );
  };

  const handleLogout = () => {
    userStore.clear();
    setCurrentUser(null);
    window.location.href = '/';
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Home Page */}
          <Route path="/" element={
            <>
              <Header currentUser={currentUser} />
              <HeroSection 
                packages={packages}
                filteredPackages={filteredPackages}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
              />
              <Footer />
            </>
          } />
          
          {/* Package Detail Page */}
          <Route path="/package/:id" element={
            <>
              <PackageDetailPage 
                packages={packages}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
              />
            </>
          } />
          
          {/* Agent Dashboard - Protected Route */}
          <Route 
            path="/agent/dashboard" 
            element={
              <ProtectedAgentRoute>
                <AgentDashboard />
              </ProtectedAgentRoute>
            } 
          />

          {/* Client Dashboard - Protected Route */}
          <Route 
            path="/client/dashboard" 
            element={
              <ProtectedClientRoute>
                <ClientDashboard user={currentUser} onLogout={handleLogout} />
              </ProtectedClientRoute>
            } 
          />

          {/* Google OAuth Callback */}
          <Route path="/auth/google/callback" element={<GoogleCallback />} />
          <Route path="/auth/google/done"     element={<GoogleDone />} />

          {/* 404 Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;