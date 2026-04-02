// HeroSection.jsx - FULL ORIGINAL + Book Now pre-login auth gating (nothing removed)
import React, { useState, useEffect, useRef } from 'react';
import {
  Filter, ChevronDown, X, DollarSign, Star, Clock,
  Check, Heart, AlertCircle, Loader2,SlidersHorizontal, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthModal from './AuthModal';
import { userStore } from '../api';

// ─────────────────────────────────────────────────────────────────────────────
// Props:
//   packages       — normalised array from App.jsx (already fetched)
//   loading        — boolean
//   error          — string | null
//   onRetry        — () => void
//   favorites      — string[]
//   toggleFavorite — (id) => void
// ─────────────────────────────────────────────────────────────────────────────
const HeroSection = ({ packages = [], loading, error, onRetry, toggleFavorite, favorites = [], currentUser }) => {
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  
  // Stores the package id the guest tried to favourite before being sent to login
  const pendingFavouriteId = React.useRef(null);
  
  // NEW: Stores the package id the guest tried to "View details" before login
  const pendingBookingId = React.useRef(null);

  // Auth-gated action — shows login modal for guests, runs callback for logged-in users
  const requireAuth = (callback, packageId = null) => {
    const user = currentUser || userStore.get();
    if (!user) {
      pendingFavouriteId.current = packageId;
      setShowAuthModal(true);
      return;
    }
    callback();
  };

  // NEW: Book Now / View details handler for guests
// Logic: Details are public - no login required
  const handleViewDetails = (packageId) => {
    navigate(`/package/${packageId}`);
  };

  // Logic: Book Now is protected - redirects to dashboard with the ID
  const handleBookNow = (packageId) => {
    const user = currentUser || userStore.get();
    if (!user) {
      pendingBookingId.current = packageId; // Save for after login
      setShowAuthModal(true);
      return;
    }
    // If already logged in, go to dashboard with the booking trigger
    navigate(`/client/dashboard?bookPackage=${packageId}`);
  };

  // Called after successful login inside HeroSection's auth modal
 const handleAuthSuccess = (user) => {
    setShowAuthModal(false);
    
    // 1. Handle pending favorites 
    if (pendingFavouriteId.current && toggleFavorite) {
      toggleFavorite(pendingFavouriteId.current);
      pendingFavouriteId.current = null;
    }

    // 2. NEW: Handle the "Book Now" redirect
    if (pendingBookingId.current) {
      const pkgId = pendingBookingId.current;
      pendingBookingId.current = null;
      // Send them to the dashboard with the package ID in the URL
      navigate(`/client/dashboard?bookPackage=${pkgId}`);
      return;
    }

    // 3. Default redirect if no specific intent
    const targetUrl = user?.role === 'agent'
      ? '/agent/dashboard?welcome=true'
      : '/client/dashboard?welcome=true';
    navigate(targetUrl);
  };

  // ── Filter state ────────────────────────────────────────────────────────────
  const [filteredPackages,    setFilteredPackages]    = useState([]);
  const [filterLoading,       setFilterLoading]       = useState(false);
  const [isScrolled,          setIsScrolled]          = useState(false);
  const [showFilters,         setShowFilters]         = useState(false);
  const [selectedFilters,     setSelectedFilters]     = useState(['all']);
  const [selectedLocations,   setSelectedLocations]   = useState([]);
  const [priceRange,          setPriceRange]          = useState([0, 10000]);
  const [duration,            setDuration]            = useState('any');
  const [rating,              setRating]              = useState('any');
  const [activeFilterGroup,   setActiveFilterGroup]   = useState(null);

  const filterRef    = useRef(null);
  const dropdownRefs = useRef({});

  // ── Scroll ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Click-outside ───────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilters(false);
      const insideDropdown = Object.values(dropdownRefs.current).some(r => r?.contains(e.target));
      if (!insideDropdown && !e.target.closest('.filter-group-button')) setActiveFilterGroup(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Filter logic ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!packages.length) { setFilteredPackages([]); return; }
    setFilterLoading(true);
    const timer = setTimeout(() => {
      let result = [...packages];

      if (selectedLocations.length > 0)
        result = result.filter(p => selectedLocations.includes(p.location));

      const activeTypeFilters = selectedFilters.filter(f => f !== 'all' && f !== 'all_months');
      if (activeTypeFilters.length > 0) {
        result = result.filter(p => {
          if (activeTypeFilters.includes(p.type)) return true;
          if (p._tags?.some(tag => activeTypeFilters.includes(tag))) return true;
          if (p._islamicMonth && activeTypeFilters.includes(p._islamicMonth)) return true;
          return false;
        });
      }

      result = result.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);

      if (duration !== 'any') {
        const [minD, maxD] = duration.split('-').map(Number);
        result = result.filter(p => p.duration >= minD && p.duration <= (maxD || Infinity));
      }

      if (rating !== 'any')
        result = result.filter(p => p.rating >= parseFloat(rating));

      setFilteredPackages(result);
      setFilterLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [packages, selectedLocations, selectedFilters, priceRange, duration, rating]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const toggleFilter = (groupId, filterId, isExclusive = false) => {
    if (groupId === 'locations') {
      setSelectedLocations(prev =>
        prev.includes(filterId) ? prev.filter(id => id !== filterId) : [...prev, filterId]
      );
      return;
    }
    if (isExclusive || filterId === 'all' || filterId.startsWith('all_')) {
      setSelectedFilters([filterId]);
    } else {
      setSelectedFilters(prev => {
        const without = prev.filter(id => id !== 'all' && !id.startsWith('all_'));
        return without.includes(filterId) ? without.filter(id => id !== filterId) : [...without, filterId];
      });
    }
    setActiveFilterGroup(null);
  };

  const clearAllFilters = () => {
    setSelectedFilters(['all']);
    setSelectedLocations([]);
    setPriceRange([0, 10000]);
    setDuration('any');
    setRating('any');
    setActiveFilterGroup(null);
  };

  const isFilterSelected = (groupId, filterId) =>
    groupId === 'locations' ? selectedLocations.includes(filterId) : selectedFilters.includes(filterId);

  const getActiveFilterCount = () => {
    let count = selectedLocations.length;
    count += selectedFilters.filter(f => f !== 'all' && f !== 'all_months').length;
    if (duration !== 'any') count++;
    if (rating !== 'any') count++;
    if (priceRange[0] > 0 || priceRange[1] < 10000) count++;
    return count;
  };

  const formatPrice = (p) => Number(p).toLocaleString('en-US');

  // ── Filter groups ───────────────────────────────────────────────────────────
  const filterGroups = [
    {
      id: 'type', label: 'Journey Type', icon: '🕋',
      options: [
        { id: 'all',   label: 'All Packages', exclusive: true },
        { id: 'umrah', label: 'Umrah', icon: '🕌' },
        { id: 'hajj',  label: 'Hajj',  icon: '🕋' },
      ]
    },
    {
      id: 'locations', label: 'Locations', icon: '📍',
      options: [
        { id: 'makkah',  label: 'Makkah',  icon: '🕋' },
        { id: 'madinah', label: 'Madinah', icon: '🕌' },
        { id: 'jeddah',  label: 'Jeddah',  icon: '🌊' },
      ]
    },
    {
      id: 'categories', label: 'Categories', icon: '⭐',
      options: [
        { id: 'ramadan', label: 'Ramadan',    icon: '🌙' },
        { id: 'luxury',  label: '1/2 star',     icon: '✨' },
        { id: 'budget',  label: '3 Star',     icon: '💰' },
        { id: 'family',  label: '4 star',     icon: '👨‍👩‍👧‍👦' },
        { id: 'short',   label: '5 star', icon: '⏱️' },
        { id: 'premium', label: '6 star',    icon: '👑' },
      ]
    },
    {
      id: 'months', label: 'Months', icon: '📅',
      options: [
        { id: 'all_months',      label: 'Any Month',       icon: '📆', exclusive: true },
        { id: 'January',        label: 'January',        icon: '🕋' },
        { id: 'February',           label: 'February',           icon: '🌙' },
        { id: 'March',   label: 'March',   icon: '🌟' },
        { id: 'April',   label: 'April',   icon: '🌙' },
        { id: 'June', label: 'June', icon: '🌙' },
        { id: 'July', label: 'July', icon: '🌙' },
        { id: 'August',           label: 'August',           icon: '🕌' },
        { id: 'September',          label: 'September',          icon: '🌙' },
        { id: 'October',   label: 'October',         icon: '🌙' },
        { id: 'November',         label: 'November',         icon: '⭐' },
        { id: 'December',      label: 'December',      icon: '🌙' },
      ]
    }
  ];

  // ── Advanced filter panel ───────────────────────────────────────────────────
  const AdvancedFilterContent = () => (
    <div className="p-5 space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center">
            <DollarSign className="h-4 w-4 mr-2 text-emerald-600" />Price Range
          </h3>
          <span className="text-sm text-emerald-600 font-medium">
            ${priceRange[0].toLocaleString()} – ${priceRange[1] >= 10000 ? '10,000+' : priceRange[1].toLocaleString()}
          </span>
        </div>
        <div className="space-y-3">
          <input type="range" min="0" max="10000" step="100" value={priceRange[0]}
            onChange={e => { const v = parseInt(e.target.value); if (v < priceRange[1]) setPriceRange([v, priceRange[1]]); }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-600"
          />
          <input type="range" min="0" max="10000" step="100" value={priceRange[1]}
            onChange={e => { const v = parseInt(e.target.value); if (v > priceRange[0]) setPriceRange([priceRange[0], v]); }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-600"
          />
          <div className="flex justify-between text-xs text-gray-400"><span>$0</span><span>$10,000+</span></div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 flex items-center mb-3">
          <Clock className="h-4 w-4 mr-2 text-emerald-600" />Duration
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {[['1-7','1–7 days'],['8-14','8–14 days'],['15-999','15+ days']].map(([val, label]) => (
            <button key={val} onClick={() => setDuration(val)}
              className={`p-2 rounded-lg text-sm font-medium transition-all ${duration === val ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {label}
            </button>
          ))}
          <button onClick={() => setDuration('any')}
            className={`col-span-3 p-2 rounded-lg text-sm font-medium transition-all ${duration === 'any' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            Any Duration
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 flex items-center mb-3">
          <Star className="h-4 w-4 mr-2 text-emerald-600" />Minimum Hotel Rating
        </h3>
        <div className="flex items-center gap-2">
          {['3','4','5'].map(r => (
            <button key={r} onClick={() => setRating(r)}
              className={`flex-1 p-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-all ${rating === r ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              <Star className="h-3 w-3" />{r}★+
            </button>
          ))}
          <button onClick={() => setRating('any')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${rating === 'any' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            Any
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <button onClick={clearAllFilters} className="text-sm text-gray-500 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100">Clear all</button>
        <button onClick={() => setShowFilters(false)} className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700">
          Show {filteredPackages.length} packages
        </button>
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative">



      {/* Sticky filter bar — compact single row, overlaps content via sticky+z-index */}
      <div className={`sticky top-16 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 transition-shadow duration-300 ${isScrolled ? 'shadow-sm' : ''}`}>
        <div className="container mx-auto px-3 sm:px-6">
          <div className="flex items-center gap-1.5 py-2 overflow-x-auto scrollbar-none">

            {/* Filter group pills */}
            {filterGroups.map((group) => (
              <div key={group.id} className="relative flex-shrink-0">
                <button
                  onClick={() => setActiveFilterGroup(activeFilterGroup === group.id ? null : group.id)}
                  data-group={group.id}
                  className={`filter-group-button flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                    isFilterSelected(group.id, group.options[0]?.id) || group.options.some(o => isFilterSelected(group.id, o.id) && o.id !== 'all' && o.id !== 'all_months')
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : activeFilterGroup === group.id
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                  }`}
                >
                  <span className="text-xs leading-none">{group.icon}</span>
                  <span>{group.label}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${activeFilterGroup === group.id ? 'rotate-180' : ''}`} />
                </button>

                {activeFilterGroup === group.id && (
                  <div
                    ref={el => dropdownRefs.current[group.id] = el}
                    className="fixed bg-white rounded-xl shadow-2xl border border-gray-100 z-[9999] w-52"
                    style={(() => {
                      const btn = document.querySelector(`[data-group="${group.id}"]`);
                      if (btn) {
                        const rect = btn.getBoundingClientRect();
                        return { top: rect.bottom + 6, left: Math.max(8, Math.min(rect.left, window.innerWidth - 216)) };
                      }
                      return { top: 120, left: 12 };
                    })()}
                  >
                    <div className="overflow-y-auto p-1.5 space-y-0.5" style={{ maxHeight: '260px' }}>
                      {group.options.map((option) => (
                        <button key={option.id} onClick={() => toggleFilter(group.id, option.id, option.exclusive)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                            isFilterSelected(group.id, option.id) ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{option.icon || group.icon}</span>
                            <span>{option.label}</span>
                          </div>
                          {isFilterSelected(group.id, option.id) && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Divider */}
            <div className="h-5 w-px bg-gray-200 flex-shrink-0 mx-0.5" />

            {/* Advanced filters button */}
            <div className="relative flex-shrink-0" ref={filterRef}>
              <button
                onClick={() => { setShowFilters(!showFilters); setActiveFilterGroup(null); }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                  showFilters || getActiveFilterCount() > 0
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                }`}
              >
                <SlidersHorizontal className="h-3 w-3" />
                <span>Filters</span>
                {getActiveFilterCount() > 0 && (
                  <span className="ml-0.5 h-4 w-4 flex items-center justify-center bg-white/30 text-[10px] rounded-full font-bold">
                    {getActiveFilterCount()}
                  </span>
                )}
              </button>
              {showFilters && (
                <div className="hidden sm:block absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-[9999]">
                  <AdvancedFilterContent />
                </div>
              )}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Package count + clear — always visible on right */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {filterLoading
                  ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin text-emerald-500" />…</span>
                  : <><span className="font-semibold text-emerald-700">{filteredPackages.length}</span> found</>
                }
              </span>
              {getActiveFilterCount() > 0 && (
                <button onClick={clearAllFilters} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-red-500 hover:bg-red-50 transition-all whitespace-nowrap">
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom sheet */}
      {showFilters && (
        <>
          <div className="sm:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setShowFilters(false)} />
          <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-base font-semibold text-gray-900">Advanced Filters</h2>
              <button onClick={() => setShowFilters(false)} className="p-1.5 rounded-full hover:bg-gray-100">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1"><AdvancedFilterContent /></div>
          </div>
        </>
      )}



      {/* Package grid */}
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 pt-3 pb-24 sm:pb-6">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/3] bg-gray-200 rounded-xl mb-3" />
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-4/5" />
                  <div className="h-3 bg-gray-200 rounded w-3/5" />
                  <div className="h-4 bg-gray-200 rounded w-2/5 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-10 max-w-sm w-full">
              <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-red-700 mb-1">Failed to load packages</p>
              <p className="text-xs text-red-500 mb-4">{error}</p>
              <button onClick={onRetry} className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors">
                <RefreshCw className="h-4 w-4" />Retry
              </button>
            </div>
          </div>
        ) : (
          <>
            {filteredPackages.length === 0 && !filterLoading ? (
              <div className="text-center py-20">
                <p className="text-gray-500 text-sm mb-3">No packages match your filters.</p>
                <button onClick={clearAllFilters} className="text-emerald-600 text-sm font-medium hover:underline">Clear all filters</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {filteredPackages.slice(0, 20).map((pkg) => (
                  <div key={pkg.id} className="group cursor-pointer">
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-2.5 bg-gray-100">
                      <img
                        src={pkg.image} alt={pkg.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={e => { e.currentTarget.src = 'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?auto=format&fit=crop&w=800&q=80'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

                      <div className="absolute bottom-2 left-2">
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm sm:text-base font-bold text-white leading-none">${formatPrice(pkg.price)}</span>
                          <span className="text-[10px] text-white/75">/ person</span>
                        </div>
                        {pkg.originalPrice > pkg.price && (
                          <span className="text-[10px] text-white/55 line-through block">${formatPrice(pkg.originalPrice)}</span>
                        )}
                      </div>

                      {pkg.duration > 0 && (
                        <div className="absolute top-2 left-2">
                          <span className="px-1.5 py-0.5 bg-white/90 backdrop-blur-sm rounded-full text-[10px] sm:text-xs font-medium text-gray-900">{pkg.duration}d</span>
                        </div>
                      )}

                      {pkg.discount > 0 && (
                        <div className="absolute top-2 right-8 sm:right-10">
                          <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] sm:text-xs font-semibold">-{pkg.discount}%</span>
                        </div>
                      )}

                      <button
                        onClick={e => { e.stopPropagation(); requireAuth(() => toggleFavorite?.(pkg.id), pkg.id); }}
                        className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full hover:scale-110 transition-transform"
                      >
                        <Heart className={`h-3 w-3 ${favorites.includes(pkg.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                      </button>

                      {pkg.rating > 0 && (
                        <div className="absolute bottom-2 right-2">
                          <div className="flex items-center px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded-full">
                            <Star className="h-2.5 w-2.5 text-amber-400 fill-current" />
                            <span className="ml-0.5 text-[10px] font-medium text-white">{pkg.rating}★</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-medium text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-1 text-xs sm:text-sm">{pkg.title}</h3>
                      <p className="text-[10px] sm:text-xs text-gray-500 line-clamp-1">
                        {[pkg.distance, pkg.hotelRating, pkg.type && (pkg.type.charAt(0).toUpperCase() + pkg.type.slice(1))].filter(Boolean).join(' · ')}
                      </p>
                      {pkg.description && <p className="text-[10px] sm:text-xs text-gray-600 line-clamp-2">{pkg.description}</p>}
                      
                      {/* ONLY THIS BUTTON WAS CHANGED - now uses the new auth-gated handler */}
                   <div className="grid grid-cols-2 gap-2 mt-2">
    <button
      onClick={() => handleViewDetails(pkg.id)}
      className="px-3 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-md shadow-emerald-600/10"
    >
     View Details
    </button>
  </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredPackages.length > 20 && (
              <div className="mt-8 text-center">
                <button className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-all">
                  Show all {filteredPackages.length} packages
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showAuthModal && (
        <div className="fixed inset-0 z-[100]">
          <AuthModal
            onClose={() => { 
              setShowAuthModal(false); 
              pendingFavouriteId.current = null; 
              pendingBookingId.current = null; 
            }}
            onAuthSuccess={handleAuthSuccess}
          />
        </div>
      )}
    </div>
  );
};

export default HeroSection;