import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import PackageCard from './components/PackageCard';
import Filters from './components/Filters';
import TrustBadges from './components/TrustBadges';
import Footer from './components/Footer';
import { packages, months } from './data/packages';
import { Sparkles, TrendingUp, Search, Shield, Clock } from 'lucide-react';

function App() {
  const [filteredPackages, setFilteredPackages] = useState(packages);
  const [sortBy, setSortBy] = useState('date');
  const [priceRange, setPriceRange] = useState([1000, 7000]);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [favorites, setFavorites] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and sort packages
  useEffect(() => {
    let filtered = [...packages];

    // Filter by month
    if (selectedMonth !== 'all') {
      filtered = filtered.filter(pkg => 
        pkg.dates.split('-')[1] === selectedMonth
      );
    }

    // Filter by price range
    filtered = filtered.filter(pkg => 
      pkg.price >= priceRange[0] && pkg.price <= priceRange[1]
    );

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(pkg =>
        pkg.packageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.agencyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.includes.some(item => item.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Sort packages
    filtered.sort((a, b) => {
      switch(sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'rating':
          return b.rating - a.rating;
        case 'duration':
          return parseInt(a.duration) - parseInt(b.duration);
        case 'date':
        default:
          return new Date(a.dates) - new Date(b.dates);
      }
    });

    setFilteredPackages(filtered);
  }, [sortBy, priceRange, selectedMonth, searchQuery]);

  const toggleFavorite = (id) => {
    setFavorites(prev =>
      prev.includes(id)
        ? prev.filter(favId => favId !== id)
        : [...prev, id]
    );
  };

  const featuredPackages = packages.filter(pkg => pkg.featured);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <HeroSection />

      {/* Featured Packages */}
      <section className="py-16 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 px-4 py-2 rounded-full mb-4">
              <Sparkles className="h-4 w-4 mr-2" />
              <span className="font-semibold">Featured Packages</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Most Popular Umrah Packages
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Hand-picked packages offering exceptional value and premium experiences
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {featuredPackages.slice(0, 3).map(pkg => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                isFavorite={favorites.includes(pkg.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </div>
      </section>

      {/* All Packages Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar */}
            <div className="lg:w-1/4">
              <div className="sticky top-24">
                {/* Search */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Search Packages</h3>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search packages, agencies, or amenities..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>

                <Filters
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  priceRange={priceRange}
                  setPriceRange={setPriceRange}
                  selectedMonth={selectedMonth}
                  setSelectedMonth={setSelectedMonth}
                  months={months}
                />
              </div>
            </div>

            {/* Packages Grid */}
            <div className="lg:w-3/4">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">
                    All Umrah Packages
                  </h2>
                  <p className="text-gray-600">
                    Showing {filteredPackages.length} packages
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="hidden md:flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-gray-600">Updated daily</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-amber-600" />
                    <span className="text-sm text-gray-600">Prices may change</span>
                  </div>
                </div>
              </div>

              {filteredPackages.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">🕌</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    No packages found
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Try adjusting your search filters or browse our featured packages
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedMonth('all');
                      setPriceRange([1000, 7000]);
                    }}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredPackages.map(pkg => (
                    <PackageCard
                      key={pkg.id}
                      pkg={pkg}
                      isFavorite={favorites.includes(pkg.id)}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {filteredPackages.length > 0 && (
                <div className="mt-12 flex justify-center">
                  <nav className="flex items-center space-x-2">
                    <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                      Previous
                    </button>
                    {[1, 2, 3, '...', 8].map((page, index) => (
                      <button
                        key={index}
                        className={`px-4 py-2 rounded-lg ${page === 1
                            ? 'bg-green-600 text-white'
                            : 'hover:bg-gray-50'
                          }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                      Next
                    </button>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <TrustBadges />
      <Footer />
    </div>
  );
}

export default App;