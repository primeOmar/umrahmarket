// HeroSection.jsx - FULL ORIGINAL + Book Now pre-login auth gating (nothing removed)
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Filter, ChevronDown, X, DollarSign, Star, Clock,
  Check, Heart, AlertCircle, Loader2,SlidersHorizontal, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthModal from './AuthModal';
import { userStore } from '../api';
import { createPackagePath } from '../utils/packageSeo';

// ─────────────────────────────────────────────────────────────────────────────
// Props:
//   packages       — normalised array from App.jsx (already fetched)
//   loading        — boolean
//   error          — string | null
//   onRetry        — () => void
//   favorites      — string[]
//   toggleFavorite — (id) => void
// ─────────────────────────────────────────────────────────────────────────────
const HeroSection = ({ packages = [], loading, error, onRetry, toggleFavorite, favorites = [], currentUser, onAuthSuccess, hideDefaultIntro = false }) => {
  const PACKAGES_PER_PAGE = 20;
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  
  // Stores the package id the guest tried to favourite before being sent to login
  const pendingFavouriteId = React.useRef(null);
  
  // Stores the package id the guest tried to "Book Now" before login
  const pendingBookingId = React.useRef(null);

  const getDashboardUrl = (user) => {
    if (!user) return '/client/dashboard?welcome=true';
    return user.role === 'agent' ? '/agent/dashboard?welcome=true' : '/client/dashboard?welcome=true';
  };

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
  const handleViewDetails = (packageId, packageTitle) => {
    navigate(createPackagePath(packageId, packageTitle));
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
    onAuthSuccess?.(user);

    // 1. Handle pending favourite — apply it, then send the user to their dashboard.
    if (pendingFavouriteId.current) {
      const pkgId = pendingFavouriteId.current;
      pendingFavouriteId.current = null;
      if (toggleFavorite) toggleFavorite(pkgId);
      navigate(getDashboardUrl(user));
      return;
    }

    // 2. Handle the "Book Now" redirect
    if (pendingBookingId.current) {
      const pkgId = pendingBookingId.current;
      pendingBookingId.current = null;
      navigate(`/client/dashboard?bookPackage=${pkgId}`);
      return;
    }

    // 3. Default redirect if no specific intent
    navigate(getDashboardUrl(user));
  };

  // ── Filter state ────────────────────────────────────────────────────────────
  // Seeded from `packages` (not []) — this is what SSR and the very first
  // client paint render before the filter effect below has ever run. With no
  // filters active on load, filteredPackages should just BE packages; seeding
  // with [] made that first paint say "No packages match your filters" even
  // though nothing was filtered — SSR doesn't run effects at all, and even
  // client-side there's a mount + 300ms-debounce gap before the effect
  // corrects it. That gap was the "flash" reported on umrahmarket.net.
  const [filteredPackages,    setFilteredPackages]    = useState(packages);
  const [filterLoading,       setFilterLoading]       = useState(false);
  const [isScrolled,          setIsScrolled]          = useState(false);
  const [showFilters,         setShowFilters]         = useState(false);
  const [selectedFilters,     setSelectedFilters]     = useState(['all']);
  const [selectedLocations,   setSelectedLocations]   = useState([]);
  const [selectedHotelStars,  setSelectedHotelStars]  = useState([]);
  const [selectedMonths,      setSelectedMonths]      = useState([]);
  // `null` means "no price filter applied yet" — matches how every other
  // filter here works (an empty array = inactive). Previously this defaulted
  // to a hardcoded [0, 10000] range that was applied UNCONDITIONALLY (see the
  // filter effect below), even before the agent ever touched the price
  // slider. Since package prices are entered in KES by Kenyan agents — a
  // single Umrah package routinely runs well into six figures — every real
  // package was silently above that hardcoded $10,000 ceiling and getting
  // filtered out by default. That's what was causing "No packages match
  // your filters" on first load with zero filters actually selected.
  const [priceRange,          setPriceRange]          = useState(null);
  const [duration,            setDuration]            = useState('any');
  const [rating,              setRating]              = useState('any');
  const [currentPage,         setCurrentPage]         = useState(1);
  const [activeFilterGroup,   setActiveFilterGroup]   = useState(null);

  // Price ceiling for the slider, derived from what's actually in the
  // package list rather than a hardcoded guess — so this works correctly
  // regardless of whether prices are entered in KES, USD, or anything
  // else, and never silently clips real packages out of the default view.
  // Rounded up to a clean step and padded slightly so the max-priced
  // package isn't sitting right at the slider's edge.
  const dynamicMaxPrice = useMemo(() => {
    const prices = packages.map((p) => Number(p.price) || 0).filter((n) => n > 0);
    if (!prices.length) return 10000;
    const highest = Math.max(...prices);
    const padded = Math.ceil((highest * 1.1) / 1000) * 1000;
    return Math.max(padded, 10000);
  }, [packages]);

  // The range actually used for filtering/rendering — falls back to the
  // full [0, dynamicMaxPrice] span whenever the agent/visitor hasn't
  // deliberately narrowed it (priceRange === null), so an untouched price
  // filter never excludes anything.
  const effectivePriceRange = priceRange ?? [0, dynamicMaxPrice];

  const filterRef          = useRef(null);
  const dropdownRefs       = useRef({});
  const groupBtnRefs       = useRef({});
  const advancedFilterBtnRef = useRef(null);

  // Viewport-relative coordinates for the two flyout panels below. Computed
  // imperatively (not via CSS `absolute`) so they always render above the
  // page and are never clipped by the horizontally-scrolling filter bar.
  const [groupDropdownPos, setGroupDropdownPos] = useState({ top: 0, left: 0 });
  const [filtersPanelPos,  setFiltersPanelPos]  = useState({ top: 0, left: 0, width: 288 });

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

  // ── Position the filter-group flyout (Type / Locations / Hotel Stars / Months) ──
  // Uses `position: fixed` + coordinates from getBoundingClientRect so the
  // panel escapes the `overflow-x-auto` filter bar instead of being clipped
  // or sandwiched behind the package grid.
  useEffect(() => {
    if (!activeFilterGroup) return;
    const PANEL_WIDTH = 208; // matches w-52
    const update = () => {
      const btn = groupBtnRefs.current[activeFilterGroup];
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setGroupDropdownPos({
        top:  rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 8)),
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [activeFilterGroup]);

  // ── Position the "Filters" advanced panel (desktop only — mobile uses the bottom sheet) ──
  useEffect(() => {
    if (!showFilters) return;
    const update = () => {
      const btn = advancedFilterBtnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const width = Math.min(320, window.innerWidth - 16);
      const left  = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
      const top   = Math.min(rect.bottom + 8, window.innerHeight - 60);
      setFiltersPanelPos({ top, left, width });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [showFilters]);


  const getHotelStarValue = (pkg) => {
    const rawValue = pkg?.rating ?? pkg?.makkah_hotel_rating ?? pkg?.hotelStars ?? pkg?.hotel_stars ?? pkg?.hotelRating ?? 0;
    if (typeof rawValue === 'number') return rawValue;
    if (typeof rawValue === 'string') {
      const match = rawValue.match(/(\d+(?:\.\d+)?)/);
      return match ? Number(match[1]) : 0;
    }
    return 0;
  };

  const getMonthNameFromDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString('en-US', { month: 'long' });
  };

  const matchesSelectedMonth = (pkg, monthName) => {
    const dateFields = [
      pkg?.makkah_check_in_date,
      pkg?.makkah_check_out_date,
      pkg?.madinah_check_in_date,
      pkg?.madinah_check_out_date,
      pkg?.available_from,
      pkg?.available_to,
    ].filter(Boolean);

    return dateFields.some((value) => getMonthNameFromDate(value) === monthName);
  };

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

      if (selectedHotelStars.length > 0) {
        result = result.filter((p) => {
          const starValue = getHotelStarValue(p);
          return selectedHotelStars.some((filterId) => {
            if (filterId === '1-2') return starValue <= 2;
            if (filterId === '3') return starValue >= 3 && starValue < 4;
            if (filterId === '4') return starValue >= 4 && starValue < 5;
            if (filterId === '5') return starValue >= 5 && starValue < 6;
            if (filterId === '6') return starValue >= 6;
            return false;
          });
        });
      }

      if (selectedMonths.length > 0) {
        result = result.filter((p) => selectedMonths.some((month) => matchesSelectedMonth(p, month)));
      }

      // Only applied once the visitor has actually moved the slider —
      // otherwise an untouched price filter must never exclude anything.
      if (priceRange !== null) {
        result = result.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
      }

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
  }, [packages, selectedLocations, selectedFilters, selectedHotelStars, selectedMonths, priceRange, duration, rating]);

  // Any filter/package-list change should start from page 1.
  useEffect(() => {
    setCurrentPage(1);
  }, [packages, selectedLocations, selectedFilters, selectedHotelStars, selectedMonths, priceRange, duration, rating]);

  const totalPages = Math.max(1, Math.ceil(filteredPackages.length / PACKAGES_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * PACKAGES_PER_PAGE;
  const paginatedPackages = filteredPackages.slice(pageStart, pageStart + PACKAGES_PER_PAGE);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const toggleFilter = (groupId, filterId, isExclusive = false) => {
    if (groupId === 'locations') {
      setSelectedLocations(prev =>
        prev.includes(filterId) ? prev.filter(id => id !== filterId) : [...prev, filterId]
      );
      return;
    }
    if (groupId === 'hotelStars') {
      setSelectedHotelStars(prev =>
        prev.includes(filterId) ? prev.filter(id => id !== filterId) : [...prev, filterId]
      );
      return;
    }
    if (groupId === 'months') {
      if (filterId === 'all_months') {
        setSelectedMonths([]);
      } else {
        setSelectedMonths(prev =>
          prev.includes(filterId) ? prev.filter(id => id !== filterId) : [...prev, filterId]
        );
      }
      setActiveFilterGroup(null);
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
    setSelectedHotelStars([]);
    setSelectedMonths([]);
    setPriceRange(null);
    setDuration('any');
    setRating('any');
    setActiveFilterGroup(null);
  };

  const isFilterSelected = (groupId, filterId) => {
    if (groupId === 'locations') return selectedLocations.includes(filterId);
    if (groupId === 'hotelStars') return selectedHotelStars.includes(filterId);
    if (groupId === 'months') return selectedMonths.includes(filterId);
    return selectedFilters.includes(filterId);
  };

  const getActiveFilterCount = () => {
    let count = selectedLocations.length;
    count += selectedHotelStars.length;
    count += selectedMonths.length;
    count += selectedFilters.filter(f => f !== 'all' && f !== 'all_months').length;
    if (duration !== 'any') count++;
    if (rating !== 'any') count++;
    if (priceRange !== null) count++;
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
      // Each option is an exact coverage tier, not an independent city — a
      // package's `location` is one of these three combos (set in
      // CreatePackageModal's "Primary Location" field), so selecting
      // "Madinah" shows only Makkah+Madinah packages, not Makkah-only ones,
      // and selecting "Jeddah" shows only the full 3-city packages.
      id: 'locations', label: 'Locations', icon: '📍',
      options: [
        { id: 'makkah',                  label: 'Makkah Only',              icon: '🕋' },
        { id: 'makkah_madinah',          label: 'Makkah & Madinah',         icon: '🕌' },
        { id: 'makkah_madinah_jeddah',   label: 'Makkah, Madinah & Jeddah', icon: '🌊' },
      ]
    },
    {
      id: 'hotelStars', label: 'Hotel Stars', icon: '🏨',
      options: [
        { id: 'all_stars', label: 'Any Hotel Star', icon: '🏨', exclusive: true },
        { id: '1-2', label: '1/2 Star Hotel', icon: '✨' },
        { id: '3', label: '3 Star', icon: '💎' },
        { id: '4', label: '4 Star', icon: '🌟' },
        { id: '5', label: '5 Star', icon: '⭐' },
        { id: '6', label: '6 Star', icon: '👑' },
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
            {effectivePriceRange[0].toLocaleString()} – {effectivePriceRange[1] >= dynamicMaxPrice ? `${dynamicMaxPrice.toLocaleString()}+` : effectivePriceRange[1].toLocaleString()}
          </span>
        </div>
        <div className="space-y-3">
          <input type="range" min="0" max={dynamicMaxPrice} step="100" value={effectivePriceRange[0]}
            onChange={e => { const v = parseInt(e.target.value); if (v < effectivePriceRange[1]) setPriceRange([v, effectivePriceRange[1]]); }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-600"
          />
          <input type="range" min="0" max={dynamicMaxPrice} step="100" value={effectivePriceRange[1]}
            onChange={e => { const v = parseInt(e.target.value); if (v > effectivePriceRange[0]) setPriceRange([effectivePriceRange[0], v]); }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-600"
          />
          {/* TODO(currency): package prices are entered directly by Kenyan
              agents with no currency field on the package itself — left
              unlabeled here rather than guessing $ vs KES. Confirm the real
              unit, then apply one consistent symbol here AND on the package
              cards below (formatPrice usages). */}
          <div className="flex justify-between text-xs text-gray-400"><span>0</span><span>{dynamicMaxPrice.toLocaleString()}+</span></div>
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

      {/* SEO intro — the only H1 on the homepage. Keep this short, plain,
          and out of the way of the filter bar; purely a text/markup
          addition, no state or behavior here.
          Skipped when hideDefaultIntro is true — landing pages (see
          LandingPage.jsx) supply their own unique H1/intro above this
          component instead, so the page never ends up with two H1s. */}
      {!hideDefaultIntro && (
        <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-b border-gray-100">
          <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 text-center">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
              Verified Umrah &amp; Hajj Packages 
            </h1>
            <p className="mt-2 text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
              Compare Umrah and Hajj packages from licensed, IATA-accredited travel agents with verified pricing, hotels, and inclusions in one place.
            </p>
          </div>
        </div>
      )}


      {/* Sticky filter bar — compact single row, overlaps content via sticky+z-index */}
      <div className={`sticky top-16 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 transition-shadow duration-300 ${isScrolled ? 'shadow-sm' : ''}`}>
        <div className="container mx-auto px-3 sm:px-6">
          <div className="flex items-center gap-1.5 py-2 overflow-x-auto scrollbar-none">

            {/* Filter group pills */}
            {filterGroups.map((group) => (
              <div key={group.id} className="relative flex-shrink-0">
                <button
                  onClick={() => setActiveFilterGroup(activeFilterGroup === group.id ? null : group.id)}
                  ref={el => { groupBtnRefs.current[group.id] = el; }}
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
                    style={{ top: groupDropdownPos.top, left: groupDropdownPos.left }}
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
                ref={advancedFilterBtnRef}
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
                <div
                  className="hidden sm:block fixed bg-white rounded-xl shadow-2xl border border-gray-100 z-[9999] max-h-[80vh] overflow-y-auto"
                  style={{ top: filtersPanelPos.top, left: filtersPanelPos.left, width: filtersPanelPos.width }}
                >
                  <AdvancedFilterContent />
                </div>
              )}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Package count + clear — always visible on right */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* <span className="text-xs text-gray-500 whitespace-nowrap">
                {filterLoading
                  ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin text-emerald-500" />…</span>
                  : <><span className="font-semibold text-emerald-700">{filteredPackages.length}</span> found</>
                }
              </span> */}
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
            {packages.length === 0 && !filterLoading ? (
              <div className="text-center py-24">
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-10 max-w-sm mx-auto">
                  <p className="text-sm font-medium text-gray-700 mb-1">No packages available right now</p>
                  <p className="text-xs text-gray-500 mb-4">Check back soon, or refresh to see if new packages have been added.</p>
                  {onRetry && (
                    <button onClick={onRetry} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors">
                      <RefreshCw className="h-4 w-4" />Refresh
                    </button>
                  )}
                </div>
              </div>
            ) : filteredPackages.length === 0 && !filterLoading ? (
              <div className="text-center py-20">
                <p className="text-gray-500 text-sm mb-3">No packages match your filters.</p>
                <button onClick={clearAllFilters} className="text-emerald-600 text-sm font-medium hover:underline">Clear all filters</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {paginatedPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="group cursor-pointer"
                    onClick={() => handleViewDetails(pkg.id, pkg.title || pkg.name)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleViewDetails(pkg.id, pkg.title || pkg.name); } }}
                  >
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-2.5 bg-gray-100">
                      {/* Blurred backdrop — a zoomed, softened copy fills the
                          card edge-to-edge so badges/gradient still have full
                          coverage, while the real photo below is never cropped. */}
                      <img
                        src={pkg.image} alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-60"
                        loading="lazy"
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
                      <img
                        src={pkg.image} alt={pkg.title}
                        className="relative w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={e => { e.currentTarget.src = 'https://images.unsplash.com/photo-1523151164408-6540213bd2c8?auto=format&fit=crop&w=800&q=80'; }}
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
                      <h3 className="font-medium text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-1 text-xs sm:text-sm capitalize">{pkg.title}</h3>
                      {pkg.agent_name && (
                        <p className="text-[10px] sm:text-xs text-emerald-700/80 font-medium line-clamp-1 uppercase ">{pkg.agent_name}</p>
                      )}
                      <p className="text-[10px] sm:text-xs text-gray-500 line-clamp-1">
                        {[pkg.distance, pkg.hotelRating, pkg.type && (pkg.type.charAt(0).toUpperCase() + pkg.type.slice(1))].filter(Boolean).join(' · ')}
                      </p>
                      {pkg.description && <p className="text-[10px] sm:text-xs text-gray-600 line-clamp-2">{pkg.description}</p>}
                      
                      <div className="mt-2">
                        <button
                          onClick={e => { e.stopPropagation(); handleViewDetails(pkg.id, pkg.title || pkg.name); }}
                          className="w-full px-3 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-md shadow-emerald-600/10 text-center"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                </div>

                {filteredPackages.length > PACKAGES_PER_PAGE && (
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safeCurrentPage === 1}
                      className="px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-300 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      Previous
                    </button>

                    {Array.from({ length: totalPages }).map((_, i) => {
                      const pageNum = i + 1;
                      const active = pageNum === safeCurrentPage;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`min-w-9 px-3 py-2 text-xs sm:text-sm rounded-lg border transition-colors ${
                            active
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-300 hover:bg-emerald-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safeCurrentPage === totalPages}
                      className="px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-300 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
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