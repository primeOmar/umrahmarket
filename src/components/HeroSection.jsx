import React, { useState, useEffect, useRef } from 'react';
import {
  Filter, ChevronDown, X, DollarSign, Star, Clock,
  Check, Heart, AlertCircle, Loader2, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// Props:
//   packages       — normalised array from App.jsx (already fetched)
//   loading        — boolean
//   error          — string | null
//   onRetry        — () => void
//   favorites      — string[]
//   toggleFavorite — (id) => void
// ─────────────────────────────────────────────────────────────────────────────
const HeroSection = ({ packages = [], loading, error, onRetry, toggleFavorite, favorites = [] }) => {
  const navigate = useNavigate();

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
        { id: 'luxury',  label: 'Luxury',     icon: '✨' },
        { id: 'budget',  label: 'Budget',     icon: '💰' },
        { id: 'family',  label: 'Family',     icon: '👨‍👩‍👧‍👦' },
        { id: 'short',   label: 'Short Stay', icon: '⏱️' },
        { id: 'premium', label: 'Premium',    icon: '👑' },
      ]
    },
    {
      id: 'months', label: 'Months', icon: '📅',
      options: [
        { id: 'all_months',      label: 'Any Month',       icon: '📆', exclusive: true },
        { id: 'muharram',        label: 'Muharram',        icon: '🕋' },
        { id: 'safar',           label: 'Safar',           icon: '🌙' },
        { id: 'rabi_al_awwal',   label: 'Rabi al-Awwal',   icon: '🌟' },
        { id: 'rabi_al_thani',   label: 'Rabi al-Thani',   icon: '🌙' },
        { id: 'jumada_al_awwal', label: 'Jumada al-Awwal', icon: '🌙' },
        { id: 'jumada_al_thani', label: 'Jumada al-Thani', icon: '🌙' },
        { id: 'rajab',           label: 'Rajab',           icon: '🕌' },
        { id: 'shaban',          label: 'Shaban',          icon: '🌙' },
        { id: 'ramadan_month',   label: 'Ramadan',         icon: '🌙' },
        { id: 'shawwal',         label: 'Shawwal',         icon: '⭐' },
        { id: 'dhul_qaada',      label: 'Dhul-Qaada',      icon: '🌙' },
        { id: 'dhul_hijjah',     label: 'Dhul-Hijjah',     icon: '🕋' },
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

      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 pt-5 pb-3 text-center">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 mb-1">
            Find your perfect Umrah journey
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">Verified packages from trusted agencies</p>
        </div>
      </div>

      {/* Sticky filter bar */}
      <div className={`sticky top-0 z-40 bg-white border-b border-gray-100 transition-shadow duration-300 ${isScrolled ? 'shadow-md' : ''}`}>
        <div className="container mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between gap-1.5 py-2.5">
            <div className="flex items-center gap-1 md:gap-2 min-w-0">
              {filterGroups.map((group) => (
                <div key={group.id} className="relative">
                  <button
                    onClick={() => setActiveFilterGroup(activeFilterGroup === group.id ? null : group.id)}
                    data-group={group.id}
                    className={`filter-group-button flex items-center gap-1 md:gap-1.5 px-2.5 md:px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                      activeFilterGroup === group.id
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-sm leading-none">{group.icon}</span>
                    <span className="hidden md:inline">{group.label}</span>
                    <ChevronDown className={`h-3 w-3 md:h-3.5 md:w-3.5 transition-transform duration-200 flex-shrink-0 ${activeFilterGroup === group.id ? 'rotate-180' : ''}`} />
                  </button>

                  {activeFilterGroup === group.id && (
                    <div
                      ref={el => dropdownRefs.current[group.id] = el}
                      className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 z-[9999] w-56 sm:w-64"
                      style={(() => {
                        const btn = document.querySelector(`[data-group="${group.id}"]`);
                        if (btn) {
                          const rect = btn.getBoundingClientRect();
                          return { top: rect.bottom + 8, left: Math.max(8, Math.min(rect.left, window.innerWidth - 240)) };
                        }
                        return { top: 120, left: 12 };
                      })()}
                    >
                      <div className="overflow-y-auto" style={{ maxHeight: group.id === 'months' ? '280px' : 'none' }}>
                        <div className="p-2 space-y-0.5">
                          {group.options.map((option) => (
                            <button key={option.id} onClick={() => toggleFilter(group.id, option.id, option.exclusive)}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                                isFilterSelected(group.id, option.id) ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-base">{option.icon || group.icon}</span>
                                <span className="font-medium">{option.label}</span>
                              </div>
                              {isFilterSelected(group.id, option.id) && <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="relative flex-shrink-0" ref={filterRef}>
              <button
                onClick={() => { setShowFilters(!showFilters); setActiveFilterGroup(null); }}
                className={`flex items-center gap-1.5 px-2.5 md:px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  showFilters ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-700 border border-gray-300 hover:border-emerald-300 hover:bg-emerald-50'
                }`}
              >
                <Filter className={`h-3.5 w-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                <span className="hidden md:inline">Filters</span>
                {getActiveFilterCount() > 0 && (
                  <span className="ml-0.5 h-4 w-4 flex items-center justify-center bg-emerald-500 text-white text-[10px] rounded-full font-bold">
                    {getActiveFilterCount()}
                  </span>
                )}
              </button>
              {showFilters && (
                <div className="hidden sm:block absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-[9999]">
                  <AdvancedFilterContent />
                </div>
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

      {/* Active filter chips */}
      {getActiveFilterCount() > 0 && (
        <div className="bg-emerald-50/60 border-b border-emerald-100/50">
          <div className="container mx-auto px-3 sm:px-6 py-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 font-medium">Active:</span>
                {selectedLocations.map(locId => {
                  const loc = filterGroups[1].options.find(o => o.id === locId);
                  if (!loc) return null;
                  return (
                    <span key={`loc-${locId}`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                      <span>{loc.icon}</span><span>{loc.label}</span>
                      <button onClick={() => toggleFilter('locations', locId)} className="ml-0.5 hover:scale-110 transition-transform"><X className="h-2.5 w-2.5" /></button>
                    </span>
                  );
                })}
                {selectedFilters.filter(f => f !== 'all' && f !== 'all_months').map(filterId => {
                  const f = filterGroups.flatMap(g => g.options).find(o => o.id === filterId);
                  if (!f) return null;
                  return (
                    <span key={`flt-${filterId}`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                      <span>{f.icon || '⭐'}</span><span>{f.label}</span>
                      <button onClick={() => toggleFilter('type', filterId)} className="ml-0.5 hover:scale-110 transition-transform"><X className="h-2.5 w-2.5" /></button>
                    </span>
                  );
                })}
                {duration !== 'any' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                    <Clock className="h-3 w-3" /><span>{duration === '15-999' ? '15+ days' : `${duration} days`}</span>
                    <button onClick={() => setDuration('any')} className="ml-0.5 hover:scale-110 transition-transform"><X className="h-2.5 w-2.5" /></button>
                  </span>
                )}
                {rating !== 'any' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                    <Star className="h-3 w-3" /><span>{rating}★+</span>
                    <button onClick={() => setRating('any')} className="ml-0.5 hover:scale-110 transition-transform"><X className="h-2.5 w-2.5" /></button>
                  </span>
                )}
                <button onClick={clearAllFilters} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100">Clear all</button>
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                <span className="font-semibold text-emerald-600">{filteredPackages.length}</span> found
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Package grid */}
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-5 sm:py-6 pb-24 sm:pb-6">
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
            <div className="mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">
                {filterLoading
                  ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-emerald-600" />Filtering…</span>
                  : `${filteredPackages.length} Package${filteredPackages.length !== 1 ? 's' : ''}`
                }
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Book with confidence — All packages verified</p>
            </div>

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
                        onClick={e => { e.stopPropagation(); toggleFavorite?.(pkg.id); }}
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
                      <button
                        onClick={() => navigate(`/package/${pkg.id}`)}
                        className="w-full mt-1 px-3 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 active:scale-[0.98] transition-all"
                      >
                        View details
                      </button>
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
    </div>
  );
};

export default HeroSection;