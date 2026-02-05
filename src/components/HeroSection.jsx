import React, { useState, useEffect, useRef } from 'react';
import { Filter, ChevronDown, X, DollarSign, Star, Clock, Shield, Check, Heart, MapPin, Calendar, Hotel, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; 

const HeroSection = ({ packages,toggleFavorite }) => {
  const navigate = useNavigate(); 
  const [isScrolled, setIsScrolled] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState(['all']);
  const [selectedLocations, setSelectedLocations] = useState(['makkah']);
  const [priceRange, setPriceRange] = useState([1000, 5000]);
  const [duration, setDuration] = useState('any');
  const [rating, setRating] = useState('any');
  const [filteredPackages, setFilteredPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [activeFilterGroup, setActiveFilterGroup] = useState(null);
  const filterRef = useRef(null);
  const dropdownRefs = useRef({});


  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close filter dropdown
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }
      
      // Close group dropdowns
      const isClickInsideDropdown = Object.values(dropdownRefs.current).some(ref => 
        ref && ref.contains(event.target)
      );
      const isClickOnFilterButton = event.target.closest('.filter-group-button');
      if (!isClickInsideDropdown && !isClickOnFilterButton) {
        setActiveFilterGroup(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Organized filter groups (4 sections)
  const filterGroups = [
    {
      id: 'type',
      label: 'Journey Type',
      icon: '🕋',
      type: 'primary',
      options: [
        { id: 'all', label: 'All Packages', exclusive: true },
        { id: 'umrah', label: 'Umrah', icon: '🕌' },
        { id: 'hajj', label: 'Hajj', icon: '🕋' },
      ]
    },
    {
      id: 'locations',
      label: 'Locations',
      icon: '📍',
      type: 'location',
      options: [
        { id: 'makkah', label: 'Makkah', icon: '🕋' },
        { id: 'madinah', label: 'Madinah', icon: '🕌' },
        { id: 'jeddah', label: 'Jeddah', icon: '🌊' },
      ]
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: '⭐',
      type: 'category',
      options: [
        { id: 'ramadan', label: 'Ramadan', icon: '🌙' },
        { id: 'luxury', label: 'Luxury', icon: '✨' },
        { id: 'budget', label: 'Budget', icon: '💰' },
        { id: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦' },
        { id: 'short', label: 'Short Stay', icon: '⏱️' },
        { id: 'premium', label: 'Premium', icon: '👑' },
      ]
    },
    {
      id: 'months',
      label: 'Months',
      icon: '📅',
      type: 'month',
      options: [
        { id: 'muharram', label: 'Muharram', icon: '🕋' },
        { id: 'safar', label: 'Safar', icon: '🌙'},
        { id: 'rabi_al_awwal', label: 'Rabi al-Awwal', icon: '🌟'},
        { id: 'rabi_al_thani', label: 'Rabi al-Thani', icon: '🌙' },
        { id: 'jumada_al_awwal', label: 'Jumada al-Awwal', icon: '🌙' },
        { id: 'jumada_al_thani', label: 'Jumada al-Thani', icon: '🌙' },
        { id: 'rajab', label: 'Rajab', icon: '🕌' },
        { id: 'shaban', label: 'Shaban', icon: '🌙' },
        { id: 'ramadan', label: 'Ramadan', icon: '🌙'},
        { id: 'shawwal', label: 'Shawwal', icon: '⭐'},
        { id: 'dhul_qaada', label: 'Dhul-Qaada', icon: '🌙' },
        { id: 'dhul_hijjah', label: 'Dhul-Hijjah', icon: '🕋'},
        { id: 'all_months', label: 'Any Month', icon: '📆', exclusive: true },
      ]
    }
  ];

  const toggleFilter = (groupId, filterId, isExclusive = false) => {
    if (groupId === 'locations') {
      setSelectedLocations(prev => 
        prev.includes(filterId)
          ? prev.filter(id => id !== filterId)
          : [...prev, filterId]
      );
      return;
    }

    if (groupId === 'type' || groupId === 'categories' || groupId === 'months') {
      if (isExclusive) {
        setSelectedFilters([filterId]);
      } else {
        setSelectedFilters(prev => {
          if (filterId === 'all' && !prev.includes('all')) {
            return ['all'];
          }
          
          // Remove exclusive options when selecting regular ones
          let newFilters = [...prev];
          if (filterId.includes('all_')) {
            newFilters = [filterId];
          } else {
            // Remove any "all" options when selecting specific ones
            newFilters = newFilters.filter(id => !id.includes('all_'));
            
            if (newFilters.includes(filterId)) {
              newFilters = newFilters.filter(id => id !== filterId);
            } else {
              newFilters = [...newFilters, filterId];
            }
          }
          
          return newFilters;
        });
      }
    }
    
    // Close dropdown after selection
    setActiveFilterGroup(null);
  };

  const clearAllFilters = () => {
    setSelectedFilters(['all']);
    setSelectedLocations(['makkah']);
    setPriceRange([1000, 5000]);
    setDuration('any');
    setRating('any');
    setActiveFilterGroup(null);
  };

  // Filter packages based on selected filters
  useEffect(() => {
    setLoading(true);
    
    setTimeout(() => {
      let filtered = [...packages];

      // Filter by location
      if (selectedLocations.length > 0) {
        filtered = filtered.filter(pkg => selectedLocations.includes(pkg.location));
      }

      // Filter by type/category/month filters
      const activeFilters = selectedFilters.filter(f => f !== 'all');
      if (activeFilters.length > 0) {
        filtered = filtered.filter(pkg => {
          // Check journey type
          if (activeFilters.includes(pkg.type)) return true;
          
          // Check categories
          const pkgCategories = Array.isArray(pkg.category) ? pkg.category : [pkg.category];
          return pkgCategories.some(cat => activeFilters.includes(cat));
        });
      }

      // Filter by price range
      filtered = filtered.filter(pkg => pkg.price >= priceRange[0] && pkg.price <= priceRange[1]);

      // Filter by duration
      if (duration !== 'any') {
        const [min, max] = duration.split('-').map(Number);
        if (max) {
          filtered = filtered.filter(pkg => pkg.duration >= min && pkg.duration <= max);
        } else {
          filtered = filtered.filter(pkg => pkg.duration >= min);
        }
      }

      // Filter by rating
      if (rating !== 'any') {
        const minRating = parseFloat(rating);
        filtered = filtered.filter(pkg => pkg.rating >= minRating);
      }

      setFilteredPackages(filtered);
      setLoading(false);
    }, 500);
  }, [selectedLocations, selectedFilters, priceRange, duration, rating, packages]);

  const getTotalPackages = () => filteredPackages.length;

  const isFilterSelected = (groupId, filterId) => {
    if (groupId === 'locations') {
      return selectedLocations.includes(filterId);
    }
    return selectedFilters.includes(filterId);
  };


  const formatPrice = (price) => {
    return price.toLocaleString('en-US');
  };

  const getActiveFilterCount = () => {
    let count = selectedFilters.filter(f => f !== 'all').length;
    count += selectedLocations.length;
    return count;
  };

  const handleGroupClick = (groupId) => {
    setActiveFilterGroup(activeFilterGroup === groupId ? null : groupId);
  };

  return (
    <div className="relative">
      {/* Ultra Minimal Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 pt-6 pb-3">
          <div className="text-center mb-4">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1">
              Find your perfect Umrah journey
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Search 200+ verified packages from trusted agencies
            </p>
          </div>
        </div>
      </div>

      {/* Centered Filter Bar with 4 Groups - FIXED */}
      <div className={`sticky top-0 z-50 bg-white border-b border-gray-100 transition-shadow duration-300 ${
        isScrolled ? 'shadow-md' : ''
      }`}>
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between py-3 gap-3">
            {/* Filter Groups - 4 Sections */}
            <div className="w-full">
              <div className="flex justify-center">
                <div className="flex items-center space-x-2 px-2 py-1 relative">
                  {filterGroups.map((group) => (
                    <div key={group.id} className="relative">
                      <button
                        onClick={() => handleGroupClick(group.id)}
                        className={`filter-group-button group relative px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 ease-out flex items-center space-x-2 ${
                          (group.id === 'type' && selectedFilters.includes('all')) ||
                          (group.id === 'locations' && selectedLocations.includes('makkah')) ||
                          activeFilterGroup === group.id
                            ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm'
                            : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-lg">{group.icon}</span>
                        <span className="hidden sm:inline">{group.label}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${
                          activeFilterGroup === group.id ? 'rotate-180' : ''
                        }`} />
                      </button>

                      {/* Dropdown for each group - SCROLLABLE FOR MONTHS */}
                      {activeFilterGroup === group.id && (
                        <div 
                          ref={el => dropdownRefs.current[group.id] = el}
                          className="absolute left-0 top-full mt-2 min-w-[280px] max-w-[320px] bg-white rounded-xl shadow-xl border border-gray-200 z-[1000] animate-in fade-in slide-in-from-top-5 duration-200"
                          style={{ 
                            zIndex: 1000,
                            transform: 'translateZ(0)',
                            willChange: 'transform, opacity',
                            maxHeight: group.id === 'months' ? '400px' : 'auto',
                            overflowY: group.id === 'months' ? 'auto' : 'visible'
                          }}
                        >
                          <div className="p-4">
                            <div className={`space-y-2 ${group.id === 'months' ? 'grid grid-cols-1' : ''}`}>
                              {group.options.map((option) => (
                                <button
                                  key={option.id}
                                  onClick={() => toggleFilter(group.id, option.id, option.exclusive)}
                                  className={`w-full flex items-center justify-between p-3 rounded-lg text-sm transition-all duration-200 hover:bg-gray-50 ${
                                    isFilterSelected(group.id, option.id)
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'text-gray-700'
                                  } ${group.id === 'months' ? 'flex-col items-start' : ''}`}
                                >
                                  <div className={`flex items-center ${group.id === 'months' ? 'w-full justify-between' : 'space-x-3'}`}>
                                    <div className="flex items-center space-x-3">
                                      <span className="text-lg">{option.icon || group.icon}</span>
                                      <div>
                                        <span className="font-medium block">{option.label}</span>
                                        {option.description && (
                                          <span className="text-xs text-gray-500 block mt-1">{option.description}</span>
                                        )}
                                      </div>
                                    </div>
                                    {isFilterSelected(group.id, option.id) && (
                                      <Check className="h-4 w-4 text-emerald-600 flex-shrink-0 ml-2" />
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Advanced Filters Button */}
            <div className="flex items-center space-x-2">
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => {
                    setShowFilters(!showFilters);
                    setActiveFilterGroup(null);
                  }}
                  className={`group relative flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                    showFilters
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md'
                      : 'text-gray-700 border border-gray-300 hover:border-emerald-300 hover:bg-emerald-50'
                  }`}
                >
                  <Filter className={`h-4 w-4 transition-all duration-300 ${
                    showFilters ? 'rotate-180' : 'group-hover:scale-110'
                  }`} />
                  <span className="hidden sm:inline">Advanced</span>
                  {getActiveFilterCount() > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-emerald-500 text-white text-xs rounded-full min-w-[20px] text-center">
                      {getActiveFilterCount()}
                    </span>
                  )}
                </button>

                {/* Expandable Advanced Filter Panel */}
                {showFilters && (
                  <div 
                    className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-[1000] animate-in fade-in slide-in-from-top-5 duration-300"
                    style={{ 
                      zIndex: 1000,
                      transform: 'translateZ(0)',
                      willChange: 'transform, opacity'
                    }}
                  >
                    <div className="p-6">
                      {/* Price Range */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                            <DollarSign className="h-4 w-4 mr-2 text-emerald-600" />
                            Price Range
                          </h3>
                          <span className="text-sm text-emerald-600 font-medium">
                            ${priceRange[0].toLocaleString()} - ${priceRange[1].toLocaleString()}
                          </span>
                        </div>
                        <div className="space-y-4">
                          <input
                            type="range"
                            min="500"
                            max="10000"
                            step="500"
                            value={priceRange[0]}
                            onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-600"
                          />
                          <input
                            type="range"
                            min="500"
                            max="10000"
                            step="500"
                            value={priceRange[1]}
                            onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-600"
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>$500</span>
                            <span>$10,000+</span>
                          </div>
                        </div>
                      </div>

                      {/* Duration */}
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center mb-3">
                          <Clock className="h-4 w-4 mr-2 text-emerald-600" />
                          Duration
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                          {['7-10', '11-14', '15+'].map((dur) => (
                            <button
                              key={dur}
                              onClick={() => setDuration(dur)}
                              className={`p-2 rounded-lg text-sm transition-all duration-300 ${
                                duration === dur
                                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-sm'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {dur} days
                            </button>
                          ))}
                          <button
                            onClick={() => setDuration('any')}
                            className={`col-span-3 p-2 rounded-lg text-sm transition-all duration-300 ${
                              duration === 'any'
                                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Any Duration
                          </button>
                        </div>
                      </div>

                      {/* Rating */}
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center mb-3">
                          <Star className="h-4 w-4 mr-2 text-emerald-600" />
                          Minimum Rating
                        </h3>
                        <div className="flex items-center space-x-2">
                          {['4.5+', '4.0+', '3.5+'].map((rate) => {
                            const rateValue = rate.replace('+', '');
                            return (
                              <button
                                key={rate}
                                onClick={() => setRating(rateValue)}
                                className={`flex-1 p-2 rounded-lg text-sm transition-all duration-300 flex items-center justify-center ${
                                  rating === rateValue
                                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                <Star className="h-3 w-3 mr-1" />
                                {rate}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => setRating('any')}
                            className={`p-2 rounded-lg text-sm transition-all duration-300 ${
                              rating === 'any'
                                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Any
                          </button>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                        <button 
                          onClick={clearAllFilters}
                          className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 transition-colors duration-300"
                        >
                          Clear all
                        </button>
                        <button className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm font-medium rounded-lg hover:shadow-md hover:scale-105 transition-all duration-300">
                          Show {getTotalPackages()} packages
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Filters Indicator */}
      {getActiveFilterCount() > 0 && (
        <div className="bg-gradient-to-r from-emerald-50/80 to-teal-50/50 border-b border-emerald-100/50">
          <div className="container mx-auto px-4 sm:px-6 py-2">
            <div className="flex items-center justify-between animate-in fade-in duration-500">
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600 font-medium">Active filters:</span>
                <div className="flex flex-wrap gap-2">
                  {/* Display selected locations */}
                  {selectedLocations.map(locationId => {
                    const location = filterGroups[1].options.find(opt => opt.id === locationId);
                    if (!location) return null;
                    return (
                      <span
                        key={`location-${locationId}`}
                        className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold flex items-center space-x-2 shadow-sm"
                      >
                        <span className="text-base">{location.icon}</span>
                        <span>{location.label}</span>
                        <button
                          onClick={() => toggleFilter('locations', locationId)}
                          className="ml-1 hover:scale-110 transition-transform duration-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                  
                  {/* Display selected filters (except "All") */}
                  {selectedFilters
                    .filter(filterId => filterId !== 'all')
                    .map(filterId => {
                      const filter = filterGroups.flatMap(g => g.options).find(f => f.id === filterId);
                      if (!filter) return null;
                      return (
                        <span
                          key={`filter-${filterId}`}
                          className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold flex items-center space-x-2 shadow-sm"
                        >
                          <span className="text-base">{filter.icon || '⭐'}</span>
                          <span>{filter.label}</span>
                          <button
                            onClick={() => toggleFilter('type', filterId)}
                            className="ml-1 hover:scale-110 transition-transform duration-200"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                </div>
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                >
                  Clear all
                </button>
              </div>
              <span className="text-xs text-gray-500">
                <span className="font-medium text-emerald-600">{getTotalPackages()} packages</span> found
              </span>
            </div>
          </div>
        </div>
      )}

   
           {/* Package Grid - 5 Columns */}
      <div className="container mx-auto px-3 sm:px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/3] bg-gray-200 rounded-xl mb-3"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-4/5"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/5"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/5 mt-2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                {getTotalPackages()} Umrah Packages
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Book with confidence - All packages verified
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredPackages.slice(0, 20).map((pkg) => (
                <div key={pkg.id} className="group cursor-pointer">
                  {/* Image Container - Compact */}
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3 bg-gray-100">
                    <img
                      src={pkg.image}
                      alt={pkg.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent"></div>
                    
                    {/* Price Overlay - Bottom Left */}
                    <div className="absolute bottom-2 left-2 flex flex-col items-start">
                      <div className="flex items-baseline">
                        <span className="text-lg font-bold text-white">
                          ${formatPrice(pkg.price)}
                        </span>
                        <span className="text-xs text-white/80 ml-1">person</span>
                      </div>
                      {pkg.originalPrice && (
                        <span className="text-xs text-white/60 line-through">
                          ${formatPrice(pkg.originalPrice)}
                        </span>
                      )}
                    </div>
                    
                    {/* Top Badges */}
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-900">
                        {pkg.duration}d
                      </span>
                    </div>
                    
                    {/* Discount Badge */}
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 bg-emerald-600 text-white rounded-full text-xs font-semibold">
                        -{pkg.discount}%
                      </span>
                    </div>
                    
                    {/* Favorite Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(pkg.id); 
                      }}
                      className="absolute top-2 right-10 p-1.5 bg-white/90 backdrop-blur-sm rounded-full hover:scale-110 transition-transform"
                    >
                      <Heart className={`h-3 w-3 ${favorites.includes(pkg.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                    </button>
                    
                    {/* Rating Overlay - Top Right */}
                    <div className="absolute top-10 right-2">
                      <div className="flex items-center px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full">
                        <Star className="h-2.5 w-2.5 text-amber-400 fill-current" />
                        <span className="ml-1 text-xs font-medium text-white">{pkg.rating}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Content - Compact */}
                  <div className="space-y-1">
                    {/* Title */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-1 text-sm">
                          {pkg.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                          {pkg.distance} • {pkg.hotelRating} • {pkg.type.charAt(0).toUpperCase() + pkg.type.slice(1)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Description */}
                    <p className="text-xs text-gray-600 line-clamp-2 h-8">
                      {pkg.description}
                    </p>
                    
                    {/* View Details Button - UPDATED TO NAVIGATE */}
                    <button 
                      onClick={() => navigate(`/package/${pkg.id}`)}
                      className="w-full mt-1 px-3 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      View details
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Load More Button */}
            {filteredPackages.length > 20 && (
              <div className="mt-8 text-center">
                <button className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-300">
                  Show all {filteredPackages.length} packages
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HeroSection;