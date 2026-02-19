// ClientDashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Calendar, Heart, Clock, Star, MapPin, 
  Hotel, Users, ChevronRight, Bell, Search, Menu, X, 
  LogOut, Settings, MessageCircle, CreditCard, Shield,
  CheckCircle, AlertCircle, Download, Share2, Filter,
  ArrowUpRight, Wallet, Award, Gift, Sparkles, BookOpen,
  Phone, Mail, Globe, ThumbsUp, Camera, Video, FileText,
  Moon, Sun, RefreshCw, ChevronLeft, ChevronDown, User,
  MoreVertical, Edit, Trash2, Copy, Eye, DownloadCloud,
  Printer, Bookmark, Flag, HelpCircle, PieChart, TrendingUp,
  Home, Grid, List, SlidersHorizontal, Wifi, Coffee, Car,
  Dumbbell, Utensils, Tv, Wind, Droplets, Bed, Bath,
  Maximize2, Minus, Plus, Headphones
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ==================== MOBILE MENU COMPONENT ====================
const MobileMenu = ({ isOpen, onClose, menuItems, activeTab, setActiveTab, user, onLogout, darkMode }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Menu Panel */}
      <div className={`fixed top-0 right-0 bottom-0 w-80 max-w-[90vw] ${darkMode ? 'bg-gray-900' : 'bg-white'} shadow-2xl transform transition-transform duration-300 ease-in-out`}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className={`p-6 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Menu</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
              </button>
            </div>
            
            {/* User Profile */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
                {user?.firstName?.charAt(0) || 'U'}
              </div>
              <div>
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {user?.firstName || 'User'} {user?.lastName || ''}
                </h3>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {user?.email || 'user@example.com'}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto p-4">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl mb-1 transition-all ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                    : darkMode 
                      ? 'text-gray-400 hover:bg-gray-800' 
                      : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.count > 0 && (
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    activeTab === item.id
                      ? 'bg-white/20 text-white'
                      : darkMode
                        ? 'bg-gray-800 text-gray-300'
                        : 'bg-gray-200 text-gray-600'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Logout */}
          <div className={`p-4 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <button
              onClick={onLogout}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                darkMode 
                  ? 'text-gray-400 hover:bg-gray-800 hover:text-red-400' 
                  : 'text-gray-600 hover:bg-red-50 hover:text-red-600'
              }`}
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== PACKAGE DISCOVERY SECTION ====================
const PackageDiscovery = ({ darkMode, onPackageSelect }) => {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('popular');

  useEffect(() => {
    // Simulate API call to fetch packages
    setTimeout(() => {
      setPackages([
        {
          id: 1,
          title: 'Premium Umrah Package',
          agency: 'Al-Haram Travels',
          price: 2499,
          duration: '10 Days',
          rating: 4.9,
          reviews: 234,
          image: 'https://images.unsplash.com/photo-1542810634-71277ad95d9d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
          location: 'Makkah & Madinah',
          distance: '200m from Haram',
          hotelRating: '5-star',
          type: 'premium',
          discount: 15,
          amenities: ['Visa Included', 'Meals', 'Transport', 'Guide']
        },
        {
          id: 2,
          title: 'Deluxe Umrah Package',
          agency: 'Qibla Tours',
          price: 1899,
          duration: '7 Days',
          rating: 4.7,
          reviews: 156,
          image: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
          location: 'Makkah',
          distance: '500m from Haram',
          hotelRating: '4-star',
          type: 'deluxe',
          discount: 10,
          amenities: ['Visa Included', 'Transport', 'Guide']
        },
        {
          id: 3,
          title: 'Economy Umrah Package',
          agency: 'Makkah Golden',
          price: 1299,
          duration: '7 Days',
          rating: 4.5,
          reviews: 89,
          image: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
          location: 'Makkah',
          distance: '800m from Haram',
          hotelRating: '3-star',
          type: 'economy',
          discount: 5,
          amenities: ['Transport', 'Guide']
        },
        {
          id: 4,
          title: 'Ramadan Special Umrah',
          agency: 'Al-Haram Travels',
          price: 3299,
          duration: '14 Days',
          rating: 4.9,
          reviews: 312,
          image: 'https://images.unsplash.com/photo-1542810634-71277ad95d9d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
          location: 'Makkah & Madinah',
          distance: '150m from Haram',
          hotelRating: '5-star',
          type: 'premium',
          discount: 20,
          amenities: ['Visa Included', 'Meals', 'Transport', 'Guide', 'Iftar']
        },
        {
          id: 5,
          title: 'Family Umrah Package',
          agency: 'Qibla Tours',
          price: 4599,
          duration: '12 Days',
          rating: 4.8,
          reviews: 67,
          image: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
          location: 'Makkah & Madinah',
          distance: '300m from Haram',
          hotelRating: '4-star',
          type: 'family',
          discount: 12,
          amenities: ['Visa Included', 'Meals', 'Transport', 'Guide', 'Kids Activities']
        },
        {
          id: 6,
          title: 'VIP Umrah Experience',
          agency: 'Makkah Golden',
          price: 5999,
          duration: '10 Days',
          rating: 5.0,
          reviews: 45,
          image: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
          location: 'Makkah & Madinah',
          distance: '100m from Haram',
          hotelRating: '5-star',
          type: 'vip',
          discount: 25,
          amenities: ['Visa Included', 'All Meals', 'Private Transport', 'Personal Guide', 'VIP Lounge']
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredPackages = packages
    .filter(pkg => 
      pkg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkg.agency.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(pkg => filterType === 'all' ? true : pkg.type === filterType)
    .sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      return b.reviews - a.reviews; // popular
    });

  const handleViewPackage = (pkg) => {
    navigate(`/package/${pkg.id}`);
  };

  const handleBookNow = (pkg) => {
    navigate(`/package/${pkg.id}?book=true`);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="animate-pulse">
            <div className={`aspect-[4/3] rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} mb-3`}></div>
            <div className={`h-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded w-3/4 mb-2`}></div>
            <div className={`h-3 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded w-1/2 mb-2`}></div>
            <div className={`h-6 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded w-1/3`}></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className={`text-xl md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Discover Umrah Packages
          </h2>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Find your perfect spiritual journey from {packages.length}+ packages
          </p>
        </div>
        
        {/* View Toggle - Hidden on mobile, visible on tablet+ */}
        <div className="hidden sm:flex items-center space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-emerald-600 text-white'
                : darkMode
                  ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-emerald-600 text-white'
                : darkMode
                  ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          <input
            type="text"
            placeholder="Search packages or agencies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              darkMode 
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' 
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
            }`}
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={`px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              darkMode 
                ? 'bg-gray-800 border-gray-700 text-white' 
                : 'bg-white border-gray-200 text-gray-900'
            }`}
          >
            <option value="all">All Packages</option>
            <option value="premium">Premium</option>
            <option value="deluxe">Deluxe</option>
            <option value="economy">Economy</option>
            <option value="family">Family</option>
            <option value="vip">VIP</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              darkMode 
                ? 'bg-gray-800 border-gray-700 text-white' 
                : 'bg-white border-gray-200 text-gray-900'
            }`}
          >
            <option value="popular">Most Popular</option>
            <option value="rating">Top Rated</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>

          {/* Mobile Filter Button */}
          <button className="sm:hidden px-3 py-2.5 border border-gray-200 rounded-xl">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Package Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredPackages.map((pkg) => (
            <div 
              key={pkg.id}
              className={`group cursor-pointer rounded-2xl overflow-hidden border transition-all duration-300 hover:shadow-xl ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700 hover:border-emerald-600' 
                  : 'bg-white border-gray-100 hover:border-emerald-300'
              }`}
              onClick={() => handleViewPackage(pkg)}
            >
              {/* Image Container */}
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={pkg.image}
                  alt={pkg.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                
                {/* Discount Badge */}
                {pkg.discount > 0 && (
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg">
                      -{pkg.discount}%
                    </span>
                  </div>
                )}
                
                {/* Price */}
                <div className="absolute bottom-3 left-3">
                  <div className="flex items-baseline">
                    <span className="text-xl font-bold text-white">${pkg.price}</span>
                    <span className="text-xs text-white/80 ml-1">/person</span>
                  </div>
                </div>
                
                {/* Rating */}
                <div className="absolute top-3 right-3">
                  <div className="flex items-center bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
                    <Star className="h-3 w-3 text-amber-400 fill-current" />
                    <span className="ml-1 text-xs font-medium text-white">{pkg.rating}</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} line-clamp-1`}>
                      {pkg.title}
                    </h3>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {pkg.agency}
                    </p>
                  </div>
                </div>

                {/* Details */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="h-3 w-3 mr-1" />
                    {pkg.duration}
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <MapPin className="h-3 w-3 mr-1" />
                    {pkg.distance}
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <Hotel className="h-3 w-3 mr-1" />
                    {pkg.hotelRating}
                  </div>
                </div>

                {/* Amenities */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {pkg.amenities.slice(0, 3).map((item, i) => (
                    <span key={i} className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full">
                      {item}
                    </span>
                  ))}
                  {pkg.amenities.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      +{pkg.amenities.length - 3}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewPackage(pkg);
                    }}
                    className="flex-1 py-2.5 border border-emerald-600 text-emerald-600 text-sm font-medium rounded-lg hover:bg-emerald-50 transition-colors"
                  >
                    View Details
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBookNow(pkg);
                    }}
                    className="flex-1 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // List View
        <div className="space-y-4">
          {filteredPackages.map((pkg) => (
            <div 
              key={pkg.id}
              className={`flex flex-col sm:flex-row rounded-2xl overflow-hidden border transition-all duration-300 hover:shadow-xl cursor-pointer ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700 hover:border-emerald-600' 
                  : 'bg-white border-gray-100 hover:border-emerald-300'
              }`}
              onClick={() => handleViewPackage(pkg)}
            >
              {/* Image */}
              <div className="sm:w-48 h-48 sm:h-auto relative overflow-hidden">
                <img
                  src={pkg.image}
                  alt={pkg.title}
                  className="w-full h-full object-cover"
                />
                {pkg.discount > 0 && (
                  <span className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg">
                    -{pkg.discount}%
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3">
                  <div>
                    <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {pkg.title}
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {pkg.agency}
                    </p>
                  </div>
                  <div className="flex items-center mt-2 sm:mt-0">
                    <Star className="h-4 w-4 text-amber-400 fill-current" />
                    <span className={`ml-1 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {pkg.rating}
                    </span>
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} ml-1`}>
                      ({pkg.reviews})
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-2" />
                    {pkg.duration}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPin className="h-4 w-4 mr-2" />
                    {pkg.distance}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Hotel className="h-4 w-4 mr-2" />
                    {pkg.hotelRating}
                  </div>
                  <div className="flex items-center text-sm font-semibold text-emerald-600">
                    ${pkg.price}/person
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {pkg.amenities.map((item, i) => (
                    <span key={i} className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {filteredPackages.length > 0 && (
        <div className="text-center pt-6">
          <button className={`px-6 py-3 rounded-xl font-medium transition-colors ${
            darkMode
              ? 'bg-gray-800 text-white hover:bg-gray-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}>
            Load More Packages
          </button>
        </div>
      )}
    </div>
  );
};

// ==================== STAT CARD COMPONENT ====================
const StatCard = ({ icon: Icon, label, value, change, color, darkMode }) => (
  <div className={`rounded-2xl p-6 shadow-lg border transition-all duration-300 ${
    darkMode 
      ? 'bg-gray-800 border-gray-700' 
      : 'bg-white border-gray-100'
  }`}>
    <div className="flex items-start justify-between mb-4">
      <div className={`p-3 rounded-xl bg-gradient-to-br ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      {change && (
        <span className="flex items-center text-sm font-medium text-emerald-600">
          <ArrowUpRight className="h-4 w-4 mr-1" />
          {change}
        </span>
      )}
    </div>
    <h3 className={`text-2xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</h3>
    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{label}</p>
  </div>
);

// ==================== BOOKING CARD COMPONENT ====================
const BookingCard = ({ booking, darkMode, onView }) => {
  const getStatusColor = (status) => {
    switch(status) {
      case 'confirmed': return 'bg-emerald-100 text-emerald-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className={`rounded-2xl overflow-hidden border transition-all duration-300 hover:shadow-xl ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
    }`}>
      <div className="relative h-40 overflow-hidden">
        <img src={booking.image} alt={booking.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-3 left-3">
          <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(booking.status)}`}>
            {booking.status.toUpperCase()}
          </span>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm border border-white flex items-center justify-center text-white text-xs font-bold">
              {booking.agencyName.charAt(0)}
            </div>
            <span className="ml-2 text-white text-xs font-medium">{booking.agencyName}</span>
          </div>
          <div className="flex items-center bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
            <Star className="h-2 w-2 text-amber-400 fill-current" />
            <span className="ml-1 text-xs text-white">{booking.rating}</span>
          </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {booking.title}
        </h3>
        
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="flex items-center text-xs text-gray-500">
            <Calendar className="h-3 w-3 mr-1" />
            {booking.duration}
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <Users className="h-3 w-3 mr-1" />
            {booking.travelers} travelers
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <MapPin className="h-3 w-3 mr-1" />
            {booking.distance}
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <Hotel className="h-3 w-3 mr-1" />
            {booking.hotelRating}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Total</p>
            <p className="text-lg font-bold text-emerald-600">${booking.price.toLocaleString()}</p>
          </div>
          <p className="text-xs text-gray-500">{booking.startDate}</p>
        </div>

        <button 
          onClick={() => onView(booking)}
          className="w-full py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
        >
          View Details
        </button>
      </div>
    </div>
  );
};

// ==================== MESSAGE CARD COMPONENT ====================
const MessageCard = ({ message, darkMode }) => (
  <div className={`p-4 hover:bg-opacity-50 transition-colors cursor-pointer ${
    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
  } ${!message.read && (darkMode ? 'bg-gray-700/30' : 'bg-emerald-50/30')}`}>
    <div className="flex items-start space-x-3">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex-shrink-0 flex items-center justify-center text-white font-bold">
        {message.sender.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {message.sender}
          </h4>
          <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {message.time}
          </span>
        </div>
        <p className={`text-xs mb-1 line-clamp-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {message.preview}
        </p>
        <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {message.bookingRef}
        </p>
      </div>
      {!message.read && <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0 mt-2"></div>}
    </div>
  </div>
);

// ==================== MAIN CLIENT DASHBOARD ====================
const ClientDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Sample Data
  const [bookings, setBookings] = useState([
    {
      id: 1,
      title: 'Premium Umrah Package',
      agencyName: 'Al-Haram Travels',
      image: 'https://images.unsplash.com/photo-1542810634-71277ad95d9d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
      price: 2499,
      duration: '10 Days',
      startDate: 'Mar 15, 2024',
      travelers: 2,
      status: 'confirmed',
      rating: 4.9,
      distance: '200m from Haram',
      hotelRating: '5-star'
    },
    {
      id: 2,
      title: 'Deluxe Umrah Package',
      agencyName: 'Qibla Tours',
      image: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
      price: 1899,
      duration: '7 Days',
      startDate: 'Apr 10, 2024',
      travelers: 1,
      status: 'pending',
      rating: 4.7,
      distance: '500m from Haram',
      hotelRating: '4-star'
    }
  ]);

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'Al-Haram Travels',
      preview: 'Your visa documents have been processed...',
      time: '5 min ago',
      bookingRef: 'Booking #UMR-001',
      read: false
    },
    {
      id: 2,
      sender: 'Qibla Tours',
      preview: 'Your itinerary has been updated...',
      time: '2 hours ago',
      bookingRef: 'Booking #UMR-002',
      read: true
    }
  ]);

  const stats = [
    { icon: Calendar, label: 'Active Bookings', value: '2', change: '+1', color: 'from-emerald-500 to-teal-600' },
    { icon: Heart, label: 'Favorites', value: '4', change: '+2', color: 'from-red-500 to-pink-600' },
    { icon: Clock, label: 'Past Journeys', value: '3', change: '+1', color: 'from-blue-500 to-indigo-600' },
    { icon: Star, label: 'Reward Points', value: '2,450', change: '+350', color: 'from-amber-500 to-orange-600' }
  ];

  const menuItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview', count: 0 },
    { id: 'bookings', icon: Calendar, label: 'My Bookings', count: bookings.length },
    { id: 'favorites', icon: Heart, label: 'Favorites', count: 4 },
    { id: 'messages', icon: MessageCircle, label: 'Messages', count: messages.filter(m => !m.read).length },
    { id: 'packages', icon: Home, label: 'Discover Packages', count: 0 },
    { id: 'settings', icon: Settings, label: 'Settings', count: 0 }
  ];

  const handleViewBooking = (booking) => {
    navigate(`/package/${booking.id}?booking=true`);
  };

  const handleViewPackage = (pkg) => {
    navigate(`/package/${pkg.id}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('userData');
    localStorage.removeItem('token');
    onLogout?.();
    navigate('/');
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Mobile Menu */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        menuItems={menuItems}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
        darkMode={darkMode}
      />

      {/* Desktop Sidebar */}
      <div className={`hidden lg:block fixed inset-y-0 left-0 w-72 ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } border-r transition-colors duration-300`}>
        <div className="h-full flex flex-col">
          {/* User Profile */}
          <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-2xl">
                  {user?.firstName?.charAt(0) || 'U'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-4 border-white rounded-full"></div>
              </div>
              <div className="flex-1">
                <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {user?.firstName || 'User'} {user?.lastName || ''}
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {user?.email || 'user@example.com'}
                </p>
                <div className="flex items-center mt-1">
                  <Star className="h-3 w-3 text-amber-400 fill-current" />
                  <span className={`text-xs ml-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Level 2 Pilgrim
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl mb-1 transition-all ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                    : darkMode 
                      ? 'text-gray-400 hover:bg-gray-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.count > 0 && (
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    activeTab === item.id
                      ? 'bg-white/20 text-white'
                      : darkMode
                        ? 'bg-gray-700 text-gray-300'
                        : 'bg-gray-200 text-gray-600'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Logout */}
          <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              onClick={handleLogout}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                darkMode 
                  ? 'text-gray-400 hover:bg-gray-700 hover:text-red-400' 
                  : 'text-gray-600 hover:bg-red-50 hover:text-red-600'
              }`}
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-72">
        {/* Top Bar */}
        <header className={`sticky top-0 z-20 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border-b transition-colors duration-300`}>
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Menu className={`h-5 w-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                </button>
                
                <h1 className={`text-lg sm:text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {activeTab === 'overview' && 'Dashboard Overview'}
                  {activeTab === 'bookings' && 'My Bookings'}
                  {activeTab === 'favorites' && 'Favorite Packages'}
                  {activeTab === 'messages' && 'Messages'}
                  {activeTab === 'packages' && 'Discover Packages'}
                  {activeTab === 'settings' && 'Settings'}
                </h1>
              </div>

              <div className="flex items-center space-x-3">
                {/* Dark Mode Toggle */}
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {darkMode 
                    ? <Sun className="h-5 w-5 text-gray-300" />
                    : <Moon className="h-5 w-5 text-gray-600" />
                  }
                </button>

                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
                  >
                    <Bell className={`h-5 w-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  </button>

                  {/* Notifications Dropdown */}
                  {showNotifications && (
                    <div className={`absolute right-0 mt-2 w-80 rounded-xl shadow-xl border overflow-hidden z-50 ${
                      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                    }`}>
                      <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          Notifications
                        </h3>
                      </div>
                      <div className="p-4 text-center text-sm text-gray-500">
                        No new notifications
                      </div>
                    </div>
                  )}
                </div>

                {/* User Menu - Desktop */}
                <div className="hidden sm:flex items-center space-x-3">
                  <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {user?.firstName || 'User'}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold">
                    {user?.firstName?.charAt(0) || 'U'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="p-4 sm:p-6 lg:p-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Welcome Banner */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
                <h2 className="text-xl sm:text-2xl font-bold mb-2">
                  Welcome back, {user?.firstName || 'Pilgrim'}! 🎉
                </h2>
                <p className="text-emerald-100 text-sm sm:text-base mb-4">
                  May your journey to the Holy Lands be blessed and fulfilling.
                </p>
                <button 
                  onClick={() => setActiveTab('packages')}
                  className="px-4 py-2 bg-white text-emerald-600 text-sm font-semibold rounded-lg hover:shadow-lg transition-all"
                >
                  Explore Packages →
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                  <StatCard key={index} {...stat} darkMode={darkMode} />
                ))}
              </div>

              {/* Recent Bookings */}
              <div className={`rounded-2xl border overflow-hidden ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
                  <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Upcoming Journeys
                  </h3>
                  <button 
                    onClick={() => setActiveTab('bookings')}
                    className="text-emerald-600 text-sm font-medium"
                  >
                    View all
                  </button>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bookings.map((booking) => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        darkMode={darkMode}
                        onView={handleViewBooking}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Messages */}
              <div className={`rounded-2xl border overflow-hidden ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
                  <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Recent Messages
                  </h3>
                  <button 
                    onClick={() => setActiveTab('messages')}
                    className="text-emerald-600 text-sm font-medium"
                  >
                    View all
                  </button>
                </div>
                <div className="divide-y divide-gray-200">
                  {messages.slice(0, 2).map((message) => (
                    <MessageCard key={message.id} message={message} darkMode={darkMode} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="space-y-4">
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                My Bookings
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    darkMode={darkMode}
                    onView={handleViewBooking}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="space-y-4">
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Favorite Packages
              </h2>
              <div className={`rounded-2xl border p-8 text-center ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <Heart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  You haven't saved any packages yet
                </p>
                <button 
                  onClick={() => setActiveTab('packages')}
                  className="mt-4 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Explore Packages
                </button>
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="space-y-4">
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Messages
              </h2>
              <div className={`rounded-2xl border overflow-hidden ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className="divide-y divide-gray-200">
                  {messages.map((message) => (
                    <MessageCard key={message.id} message={message} darkMode={darkMode} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'packages' && (
            <PackageDiscovery 
              darkMode={darkMode} 
              onPackageSelect={handleViewPackage}
            />
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Settings
              </h2>
              <div className={`rounded-2xl border p-6 ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      defaultValue={`${user?.firstName || ''} ${user?.lastName || ''}`}
                      className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-200 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Email
                    </label>
                    <input
                      type="email"
                      defaultValue={user?.email || ''}
                      className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-200 text-gray-900'
                      }`}
                    />
                  </div>
                  <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Mobile Footer */}
        <footer className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-4">
          <div className="flex items-center justify-around">
            {menuItems.slice(0, 4).map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center p-2 ${
                  activeTab === item.id ? 'text-emerald-600' : 'text-gray-500'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs mt-1">{item.label}</span>
                {item.count > 0 && (
                  <span className="absolute -top-1 right-0 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </footer>

        {/* Bottom Padding for Mobile */}
        <div className="lg:hidden h-16"></div>
      </div>
    </div>
  );
};

export default ClientDashboard;