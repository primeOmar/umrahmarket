import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import PackageDetailPage from './components/PackageDetailPage';
import Footer from './components/Footer';
import { packages } from './data/packages';

function App() {
  const [filteredPackages, setFilteredPackages] = useState(packages);
  const [favorites, setFavorites] = useState([]);

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

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Home Page */}
          <Route path="/" element={
            <>
              <Header />
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
        </Routes>
      </div>
    </Router>
  );
}

export default App;