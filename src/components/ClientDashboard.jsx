// ClientDashboard.jsx - Complete Production Ready Version
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Maximize2, Minus, Plus, Headphones, Loader2, Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { userStore, request } from '../api';
import { getFavourites, toggleFavourite, getAllActivePackages } from './agent/packages/services/packagesApi';
import BookingFlow from './BookingFlow';
import FacePhotoModal from './FacePhotoModal';
import MessagesPanel from './MessagesPanel';
import { supabase } from '../config/supabaseClient';
import { useFxRate } from '../hooks/useFxRate';

// A package's `location` is one of three coverage tiers set by the agent in
// CreatePackageModal ("Primary Location"), not a single free-text city —
// this turns the raw value into the label clients should see.
const LOCATION_LABELS = {
  makkah:                 'Makkah Only',
  makkah_madinah:         'Makkah & Madinah',
  makkah_madinah_jeddah:  'Makkah, Madinah & Jeddah',
};
const formatLocation = (loc) => LOCATION_LABELS[(loc || '').toLowerCase()] || 'Makkah Only';

// ==================== TOAST NOTIFICATION SYSTEM ====================
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-emerald-500' : 'bg-blue-500';
  const Icon = type === 'error' ? AlertCircle : type === 'success' ? CheckCircle : Info;

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white ${bgColor} animate-slide-up`}>
      <Icon className="h-5 w-5" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return { toasts, showToast, removeToast };
};

// ==================== CONSTANTS ====================
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_VERSION = 'v3'; // bump this whenever normalise() changes shape

// Reward points: 2 USD spent = 1 point, earned per successfully booked package.
const USD_PER_REWARD_POINT = 2;
// Used only when a booking has neither payment.amount_usd nor fx_rate_used
// (older/legacy rows). Keep in sync with the backend's fallback FX rate in
// currency.service.js if that changes.
const FALLBACK_KES_PER_USD = 129;

// ==================== UTILITIES ====================

/**
 * computeRewardPoints — derives reward points from real spend instead of a
 * static number. Counts only successfully booked packages (confirmed or
 * completed), converts each booking's amount to its USD equivalent using
 * the same priority order as the booking card's usdEquivalent display,
 * then applies the 2-USD-spent = 1-point rule.
 */
const computeRewardPoints = (bookings = []) => {
  const eligible = bookings.filter(b =>
    ['confirmed', 'completed'].includes(b.status?.toLowerCase())
  );

  const totalUsdSpent = eligible.reduce((sum, b) => {
    const usd = b.payment?.amount_usd != null
      ? Number(b.payment.amount_usd)
      : (b.payment?.fx_rate_used && b.amount_paid)
        ? Number(b.amount_paid) / Number(b.payment.fx_rate_used)
        : (b.amount_paid ? Number(b.amount_paid) / FALLBACK_KES_PER_USD : 0);
    return sum + (Number.isFinite(usd) ? usd : 0);
  }, 0);

  return Math.floor(totalUsdSpent / USD_PER_REWARD_POINT);
};

/**
 * normalise — maps raw backend package fields to a consistent frontend shape.
 * Handles every known backend response variant so components always get
 * the same field names regardless of API version.
 */
const normalise = (pkg) => {
  // image_urls may be plain strings OR objects like { url, path, secure_url }
  const rawImageUrls = pkg.image_urls ?? pkg.imageUrls ?? pkg.images ?? [];
  const imageUrls = rawImageUrls
    .map(img => (typeof img === 'string' ? img : img?.url ?? img?.secure_url ?? img?.path ?? ''))
    .filter(Boolean);
  const firstImage =
    imageUrls[0] ||
    pkg.image ||
    pkg.thumbnail ||
    'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?auto=format&fit=crop&w=800&q=80';

  const rawPrice = pkg.price_per_person ?? pkg.pricePerPerson ?? pkg.price ?? 0;
  const rawOriginal = pkg.original_price ?? pkg.originalPrice ?? rawPrice;

  const discount =
    rawOriginal > rawPrice
      ? Math.round(((rawOriginal - rawPrice) / rawOriginal) * 100)
      : 0;

  return {
    // identity — prefer Supabase UUID (pkg.id); fall back to Mongo _id only if id absent
    id:            String(pkg.id ?? pkg._id ?? ''),

    // status — preserved so backend can validate package availability
    status:        pkg.status ?? 'active',

    // display
    title:         pkg.name ?? pkg.title ?? pkg.packageName ?? 'Umrah Package',
    description:   pkg.description ?? '',
    image:         firstImage,
    images:        imageUrls.length ? imageUrls : [firstImage],

    // pricing
    price:         Number(rawPrice),
    originalPrice: Number(rawOriginal),
    discount,

    // trip info
    duration:      Number(pkg.duration_days ?? pkg.durationDays ?? pkg.duration ?? 0),
    type:          (pkg.package_type ?? pkg.packageType ?? pkg.type ?? 'umrah').toLowerCase(),
    location:      (pkg.location ?? pkg.city ?? 'makkah').toLowerCase(),
    distance:      pkg.makkah_hotel_distance ?? pkg.distance ?? '',
    // schema uses makkah_hotel_rating (string "1"–"6"), not hotel_stars —
    // same field HeroSection's getHotelStarValue() falls back to.
    hotelRating:   pkg.makkah_hotel_rating ? `${pkg.makkah_hotel_rating}★ Hotel` : (pkg.hotel_stars ? `${pkg.hotel_stars}★ Hotel` : (pkg.hotelRating ?? '')),
    hotelStars:    Number(pkg.makkah_hotel_rating ?? pkg.hotel_stars ?? pkg.hotelStars ?? 0),

    // meta
    rating:        Number(pkg.average_rating ?? pkg.rating ?? 0),
    reviews:       Number(pkg.review_count ?? pkg.reviews ?? 0),
    availableSeats:Number(pkg.available_seats ?? pkg.availableSeats ?? pkg.seats ?? 0),
    featured:      Boolean(pkg.is_featured ?? pkg.featured ?? false),
    verified:      Boolean(pkg.is_verified ?? pkg.verified ?? false),

    // agency
    agencyName:    pkg.agency?.name ?? pkg.agencyName ?? pkg.company_name ?? '',
    agencyId:      String(pkg.agency?._id ?? pkg.agency?.id ?? pkg.agencyId ?? ''),

    // extras
    includes:      pkg.includes ?? pkg.amenities ?? [],
    startDate:     pkg.start_date ?? pkg.startDate ?? pkg.dates ?? null,
    _tags:         pkg.tags ?? [],
    _islamicMonth: pkg.islamic_month ?? pkg.islamicMonth ?? null,
  };
};

// ==================== CUSTOM HOOKS ====================
const usePackages = (showToast) => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPackages = useCallback(async (force = false) => {
    try {
      setLoading(true);
      setError(null);

      const cacheKey     = `packages_cache_${CACHE_VERSION}`;
      const cacheTimeKey = `packages_cache_time_${CACHE_VERSION}`;
      const cached       = localStorage.getItem(cacheKey);
      const cacheTime    = localStorage.getItem(cacheTimeKey);

      if (!force && cached && cacheTime && (Date.now() - parseInt(cacheTime)) < CACHE_TTL) {
        setPackages(JSON.parse(cached));
        setLoading(false);
        return;
      }

      const data = await getAllActivePackages();
      const raw = Array.isArray(data)
        ? data
        : (data.packages ?? data.data?.packages ?? data.data ?? []);

      // Debug: log the first raw package so you can confirm the image field name
      if (raw.length > 0) {
        const sample = raw[0];
        console.log('[PackageDebug] image fields on first package:', {
          image:      sample.image,
          images:     sample.images,
          image_urls: sample.image_urls,
          imageUrls:  sample.imageUrls,
        });
        if (sample.image_urls?.length) {
          console.log('[PackageDebug] image_urls[0] structure:', JSON.stringify(sample.image_urls[0]));
        }
      }

      const packagesList = raw.map(normalise);

      localStorage.setItem(cacheKey,     JSON.stringify(packagesList));
      localStorage.setItem(cacheTimeKey, Date.now().toString());

      setPackages(packagesList);
    } catch (err) {
      console.error('Error fetching packages:', err);
      setError(err.message || 'Failed to load packages');

      // Fall back to cache if available
      const cached = localStorage.getItem(`packages_cache_${CACHE_VERSION}`);
      if (cached) {
        try {
          // Cache already normalised — do NOT re-normalise
          setPackages(JSON.parse(cached));
          if (showToast) showToast('Using cached packages — refresh to update', 'info');
        } catch {
          setPackages([]);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  return { packages, loading, error, refetch: () => fetchPackages(true) };
};


// ==================== STAT CARD COMPONENT ====================
const StatCard = ({ icon: Icon, label, value, change, color, darkMode, loading }) => (
  <div className={`rounded-2xl p-6 shadow-lg border transition-all duration-300 hover:shadow-xl ${
    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
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
    {loading ? (
      <div className="h-8 w-20 bg-gray-200 rounded animate-pulse mb-1"></div>
    ) : (
      <h3 className={`text-2xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</h3>
    )}
    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{label}</p>
  </div>
);

// ==================== BOOKING CARD COMPONENT ====================
const BookingCard = ({ booking, darkMode, onView, onAddPhoto }) => {
  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'confirmed': return 'bg-emerald-100 text-emerald-700';
      case 'pending':   return 'bg-amber-100 text-amber-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default:          return 'bg-gray-100 text-gray-700';
    }
  };

  // Supabase join returns booking.package as an object
  const pkg = booking.package ?? {};

  const rawImgs = pkg.image_urls ?? pkg.imageUrls ?? pkg.images ?? [];
  const firstImg = (typeof rawImgs[0] === 'string' ? rawImgs[0] : rawImgs[0]?.url ?? rawImgs[0]?.secure_url ?? null)
    || 'https://images.unsplash.com/photo-1542810634-71277ad95d9d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80';

  // agent_name lives directly on the package row (no agencies join table)
  const agencyName = pkg.agent_name ?? booking.agency_name ?? 'Travel Agency';
  const packageName = pkg.name ?? booking.title ?? 'Umrah Package';
  // schema uses `duration` (integer days), not duration_days
  const duration = pkg.duration ? `${pkg.duration} Days` : '—';
  // schema uses makkah_hotel_rating (string "1"–"6"), not hotel_stars
  const hotelRating = pkg.makkah_hotel_rating ? `${pkg.makkah_hotel_rating}★ Hotel` : '—';
  const distance = pkg.makkah_hotel_distance ?? 'Makkah & Madinah';

  // amount_paid is KES — source of truth for what was actually charged.
  // payment.amount_usd / fx_rate_used (when present) give the USD equivalent
  // the client saw at checkout.
  const currency = booking.currency ?? 'KES';
  const totalDisplay = booking.amount_paid
    ? `${currency} ${Number(booking.amount_paid).toLocaleString()}`
    : '—';
  const usdEquivalent = booking.payment?.amount_usd != null
    ? Number(booking.payment.amount_usd)
    : (booking.payment?.fx_rate_used && booking.amount_paid)
      ? Number(booking.amount_paid) / Number(booking.payment.fx_rate_used)
      : null;

  const dateDisplay = booking.confirmed_at
    ? new Date(booking.confirmed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : booking.created_at
      ? new Date(booking.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'TBD';

  return (
    <div className={`rounded-2xl overflow-hidden border transition-all duration-300 hover:shadow-xl ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
    }`}>
      <div className="relative h-40 overflow-hidden">
        <img src={firstImg} alt={packageName} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-3 left-3">
          <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(booking.status)}`}>
            {booking.status?.toUpperCase() || 'PENDING'}
          </span>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm border border-white flex items-center justify-center text-white text-xs font-bold">
              {agencyName.charAt(0)}
            </div>
            <span className="ml-2 text-white text-xs font-medium">{agencyName}</span>
          </div>
          <div className="flex items-center bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
            <span className="text-xs text-white">{booking.payment_method ?? 'CARD'}</span>
          </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className={`font-semibold mb-2 line-clamp-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {packageName}
        </h3>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="flex items-center text-xs text-gray-500">
            <Calendar className="h-3 w-3 mr-1" />
            {duration}
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <MapPin className="h-3 w-3 mr-1" />
            {distance}
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <Hotel className="h-3 w-3 mr-1" />
            {hotelRating}
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <Clock className="h-3 w-3 mr-1" />
            {dateDisplay}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Total Paid</p>
            <p className="text-lg font-bold text-emerald-600">{totalDisplay}</p>
            {usdEquivalent != null && (
              <p className="text-[11px] text-gray-400">
                ≈ ${usdEquivalent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </p>
            )}
          </div>
          {booking.payment?.result_code && (
            <p className="text-xs text-gray-400 font-mono">#{booking.payment.result_code}</p>
          )}
        </div>

        <button
          onClick={() => onView(booking)}
          className="w-full py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
        >
          View Details
        </button>

        {/* Face-photo nudge — only shown when caller signals this booking needs one */}
        {onAddPhoto && (
          <button
            onClick={() => onAddPhoto(booking)}
            className="w-full mt-2 py-2.5 flex items-center justify-center gap-2 rounded-lg border-2 border-amber-400 bg-amber-50 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition-colors"
          >
            <Camera className="h-4 w-4" />
            Add Umrah ID Photo
          </button>
        )}
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
        {message.sender?.charAt(0) || 'A'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {message.sender || 'Agency'}
          </h4>
          <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {message.created_at ? new Date(message.created_at).toLocaleTimeString() : message.time}
          </span>
        </div>
        <p className={`text-xs mb-1 line-clamp-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {message.preview || message.content || 'No message preview'}
        </p>
        <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {message.booking_ref || message.subject || 'Booking reference'}
        </p>
      </div>
      {!message.read && <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0 mt-2"></div>}
    </div>
  </div>
);

// ==================== PACKAGE CARD COMPONENT (HeroSection-style) ====================
const PackageCard = ({ pkg, darkMode, onView, onBook, isFav = false, onToggleFav, isBooked = false }) => {
  const imageUrl = pkg.image || (pkg.image_urls?.[0]) ||
    'https://images.unsplash.com/photo-1542810634-71277ad95d9d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80';

  // Package prices are stored in USD; show live KES conversion as the
  // headline figure since that's what clients in Kenya actually pay.
  const { fmtKes, loading: fxLoading } = useFxRate();

  return (
    <div className="group cursor-pointer" onClick={() => onView(pkg)}>
      {/* Image block */}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-2.5 bg-gray-100">
        <img
          src={imageUrl}
          alt={pkg.name || pkg.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={e => { e.currentTarget.src = 'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?auto=format&fit=crop&w=800&q=80'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

        {/* Price */}
        <div className="absolute bottom-2 left-2">
          <div className="flex items-baseline gap-1">
            <span className="text-sm sm:text-base font-bold text-white leading-none">
              {fxLoading ? `$${(pkg.price || 0).toLocaleString()}` : fmtKes(pkg.price || 0)}
            </span>
            <span className="text-[10px] text-white/75">/ person</span>
          </div>
          <span className="text-[10px] text-white/65">${(pkg.price || 0).toLocaleString()} USD</span>
          {pkg.originalPrice > pkg.price && (
            <span className="text-[10px] text-white/55 line-through block">
              ${(pkg.originalPrice || 0).toLocaleString()}
            </span>
          )}
        </div>

        {/* Duration badge */}
        {pkg.duration > 0 && (
          <div className="absolute top-2 left-2">
            <span className="px-1.5 py-0.5 bg-white/90 backdrop-blur-sm rounded-full text-[10px] sm:text-xs font-medium text-gray-900">
              {pkg.duration}d
            </span>
          </div>
        )}

        {/* Discount badge */}
        {pkg.discount > 0 && (
          <div className="absolute top-2 right-8 sm:right-10">
            <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] sm:text-xs font-semibold">
              -{pkg.discount}%
            </span>
          </div>
        )}

        {/* Heart button */}
        {onToggleFav && (
          <button
            onClick={e => { e.stopPropagation(); onToggleFav(pkg); }}
            className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full hover:scale-110 transition-transform"
          >
            <Heart className={`h-3 w-3 ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
          </button>
        )}

        {/* Rating */}
        {pkg.rating > 0 && (
          <div className="absolute bottom-2 right-2">
            <div className="flex items-center px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded-full">
              <Star className="h-2.5 w-2.5 text-amber-400 fill-current" />
              <span className="ml-0.5 text-[10px] font-medium text-white">{pkg.rating}★</span>
            </div>
          </div>
        )}
      </div>

      {/* Text below image */}
      <div className="space-y-1">
        <h3 className={`font-medium line-clamp-1 text-xs sm:text-sm group-hover:text-emerald-700 transition-colors ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {pkg.title || pkg.name}
        </h3>
        <p className={`text-[10px] sm:text-xs line-clamp-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {[pkg.distance, pkg.hotelRating, pkg.type && (pkg.type.charAt(0).toUpperCase() + pkg.type.slice(1))].filter(Boolean).join(' · ')}
        </p>
        {pkg.description && (
          <p className={`text-[10px] sm:text-xs line-clamp-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {pkg.description}
          </p>
        )}
        <div className="grid grid-cols-2 gap-1.5 mt-2">
          <button
            onClick={e => { e.stopPropagation(); onView(pkg); }}
            className="px-2 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 active:scale-[0.98] transition-all"
          >
            View Details
          </button>
          {isBooked ? (
            <button
              disabled
              className={`px-2 py-1.5 text-xs font-medium rounded-lg border cursor-not-allowed ${
                darkMode
                  ? 'border-gray-600 text-gray-500 bg-gray-700'
                  : 'border-gray-300 text-gray-400 bg-gray-100'
              }`}
            >
              Already Booked
            </button>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); onBook(pkg); }}
              className={`px-2 py-1.5 text-xs font-medium rounded-lg border active:scale-[0.98] transition-all ${
                darkMode
                  ? 'border-gray-600 text-gray-300 hover:border-emerald-500 hover:text-emerald-400'
                  : 'border-gray-300 text-gray-700 hover:border-emerald-500 hover:text-emerald-600'
              }`}
            >
              Book Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== FILTER DROPDOWN (popover pill) ====================
const FilterDropdown = ({ label, icon, active, isOpen, onToggle, onClose, darkMode, width = 'w-64', children }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      <button
        onClick={onToggle}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
          active
            ? 'bg-emerald-600 text-white border-emerald-600'
            : darkMode
              ? 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-600'
              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
        }`}
      >
        {icon}
        {label}
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 top-full mt-2 ${width} max-w-[85vw] z-30 rounded-2xl border shadow-xl p-3 ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
};

const FilterOption = ({ label, selected, onClick, darkMode }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between transition-colors ${
      selected
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
    }`}
  >
    <span>{label}</span>
    {selected && <CheckCircle className="h-4 w-4 flex-shrink-0" />}
  </button>
);

// ==================== PACKAGE DISCOVERY SECTION ====================
const PackageDiscovery = ({ darkMode, onPackageSelect, onBook, packages = [], loading = false, error = null, onRetry, favorites = [], onToggleFav, bookings = [] }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    type: 'all',
    location: 'all',
    stars: 'all',
    duration: 'all',
    priceRange: { min: 0, max: 10000 }
  });
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [priceCeil, setPriceCeil] = useState(10000);
  const [openDropdown, setOpenDropdown] = useState(null); // 'location' | 'rating' | 'duration' | 'price' | null
  const toggleDropdown = (name) => setOpenDropdown(prev => (prev === name ? null : name));

  // Get bookings from context or parent component
  // const { bookings } = useContext(DashboardContext) || { bookings: [] };

  // Helper function to check if package is already booked
  const isPackageBooked = (pkgId) => {
    return bookings.some(b => 
      String(b.package_id) === String(pkgId) && 
      ['confirmed', 'pending'].includes(b.status?.toLowerCase())
    );
  };

  useEffect(() => {
    if (packages.length) {
      const maxPrice = Math.max(...packages.map(p => p.price || 0), 1000);
      const ceil = Math.ceil(maxPrice / 500) * 500;
      setPriceCeil(ceil);
      setFilters(prev => ({ ...prev, priceRange: { ...prev.priceRange, max: ceil } }));
    }
  }, [packages]);

  const filteredAndSorted = useMemo(() => {
    let result = [...packages];

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(p => 
        (p.name || '').toLowerCase().includes(query) ||
        (p.description || '').toLowerCase().includes(query) ||
        (p.location || '').toLowerCase().includes(query) ||
        (p.agency_name || '').toLowerCase().includes(query)
      );
    }

    if (filters.type !== 'all') {
      result = result.filter(p => p.type === filters.type);
    }

    // Exact-tier match: a package's `location` is one of three coverage
    // combos ("makkah" / "makkah_madinah" / "makkah_madinah_jeddah"), so
    // selecting "Madinah" shows only Makkah+Madinah packages — not
    // Makkah-only ones — and selecting "Jeddah" shows only the full
    // 3-city packages, not every package.
    if (filters.location !== 'all') {
      result = result.filter(p => (p.location || '').toLowerCase() === filters.location);
    }

    if (filters.stars !== 'all') {
      const minStars = parseInt(filters.stars);
      result = result.filter(p => (p.hotelStars || 0) >= minStars);
    }

    if (filters.duration !== 'all') {
      const [min, max] = filters.duration.split('-').map(Number);
      result = result.filter(p => {
        const duration = p.duration || 0;
        return duration >= min && (max ? duration <= max : true);
      });
    }

    result = result.filter(p => {
      const price = p.price || 0;
      return price >= filters.priceRange.min && price <= filters.priceRange.max;
    });

    result.sort((a, b) => {
      switch(sortBy) {
        case 'price-asc': return (a.price || 0) - (b.price || 0);
        case 'price-desc': return (b.price || 0) - (a.price || 0);
        case 'rating': return (b.rating || 0) - (a.rating || 0);
        case 'duration': return (a.duration || 0) - (b.duration || 0);
        default: return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
    });

    return result;
  }, [packages, search, filters, sortBy]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.type !== 'all') count++;
    if (filters.location !== 'all') count++;
    if (filters.stars !== 'all') count++;
    if (filters.duration !== 'all') count++;
    if (filters.priceRange.min > 0 || filters.priceRange.max < priceCeil) count++;
    return count;
  }, [filters, priceCeil]);

  const clearFilters = () => {
    setFilters({
      type: 'all',
      location: 'all',
      stars: 'all',
      duration: 'all',
      priceRange: { min: 0, max: priceCeil }
    });
    setSearch('');
    setSortBy('newest');
  };

  const LOCATION_OPTIONS = [
    { id: 'makkah',                label: '📍 Makkah Only' },
    { id: 'makkah_madinah',        label: '📍 Makkah & Madinah' },
    { id: 'makkah_madinah_jeddah', label: '📍 Makkah, Madinah & Jeddah' },
  ];
  const RATING_OPTIONS = [3, 4, 5].map(s => ({ id: s.toString(), label: `${s}+ Stars` }));
  const DURATION_OPTIONS = [
    { id: '1-7',    label: '1–7 Days' },
    { id: '8-14',   label: '8–14 Days' },
    { id: '15-999', label: '15+ Days' },
  ];

  // Chips describing every currently-active filter, each with its own
  // one-click remove — lets people see and undo their filters without
  // opening a dropdown.
  const activeChips = useMemo(() => {
    const chips = [];
    if (filters.type !== 'all') {
      chips.push({
        key: 'type',
        label: filters.type === 'umrah' ? '🕌 Umrah' : '🏕 Hajj',
        onRemove: () => setFilters(prev => ({ ...prev, type: 'all' })),
      });
    }
    if (filters.location !== 'all') {
      chips.push({
        key: 'location',
        label: LOCATION_OPTIONS.find(o => o.id === filters.location)?.label,
        onRemove: () => setFilters(prev => ({ ...prev, location: 'all' })),
      });
    }
    if (filters.stars !== 'all') {
      chips.push({
        key: 'stars',
        label: `★ ${filters.stars}+`,
        onRemove: () => setFilters(prev => ({ ...prev, stars: 'all' })),
      });
    }
    if (filters.duration !== 'all') {
      chips.push({
        key: 'duration',
        label: `⏱ ${DURATION_OPTIONS.find(o => o.id === filters.duration)?.label}`,
        onRemove: () => setFilters(prev => ({ ...prev, duration: 'all' })),
      });
    }
    if (filters.priceRange.min > 0 || filters.priceRange.max < priceCeil) {
      chips.push({
        key: 'price',
        label: `$${filters.priceRange.min.toLocaleString()} – $${filters.priceRange.max.toLocaleString()}`,
        onRemove: () => setFilters(prev => ({ ...prev, priceRange: { min: 0, max: priceCeil } })),
      });
    }
    return chips;
  }, [filters, priceCeil]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className={`aspect-[4/3] rounded-xl mb-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
            <div className={`h-4 rounded w-3/4 mb-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
            <div className={`h-3 rounded w-1/2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-16 rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <AlertCircle className="h-12 w-12 mx-auto mb-3 text-red-500" />
        <p className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Failed to load packages</p>
        <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{error}</p>
        <button 
          onClick={onRetry}
          className="px-5 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`sticky top-0 z-10 -mx-1 px-1 pb-3 pt-1 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search packages by name, destination, or agency..."
              className={`w-full pl-9 pr-8 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' 
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
              }`}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          
          <div className={`flex rounded-xl border overflow-hidden flex-shrink-0 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <button onClick={() => setViewMode('grid')} className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-emerald-600 text-white' : darkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'}`}>
              <Grid className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-emerald-600 text-white' : darkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'}`}>
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Desktop / tablet filter bar — grouped dropdowns instead of a wall
            of pills. Wraps onto a second line at narrower widths rather
            than clipping, since popovers need visible overflow. */}
        <div className="hidden lg:flex flex-wrap items-center gap-2">
          {/* Trip type — segmented control, one visual unit instead of two loose pills */}
          <div className={`inline-flex rounded-xl border p-0.5 flex-shrink-0 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
            {[
              { id: 'all', label: 'All trips' },
              { id: 'umrah', label: '🕌 Umrah' },
              { id: 'hajj', label: '🏕 Hajj' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setFilters(prev => ({ ...prev, type: opt.id }))}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  filters.type === opt.id
                    ? 'bg-emerald-600 text-white'
                    : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <FilterDropdown
            label="Location" icon={<MapPin className="h-3.5 w-3.5" />}
            active={filters.location !== 'all'}
            isOpen={openDropdown === 'location'}
            onToggle={() => toggleDropdown('location')}
            onClose={() => setOpenDropdown(null)}
            darkMode={darkMode} width="w-72"
          >
            {/* Exact-tier match: selecting Madinah shows only Makkah+Madinah
                packages, selecting Jeddah shows only full 3-city packages. */}
            <FilterOption label="All locations" selected={filters.location === 'all'} darkMode={darkMode}
              onClick={() => { setFilters(prev => ({ ...prev, location: 'all' })); setOpenDropdown(null); }} />
            {LOCATION_OPTIONS.map(opt => (
              <FilterOption key={opt.id} label={opt.label} selected={filters.location === opt.id} darkMode={darkMode}
                onClick={() => { setFilters(prev => ({ ...prev, location: opt.id })); setOpenDropdown(null); }} />
            ))}
          </FilterDropdown>

          <FilterDropdown
            label="Rating" icon={<Star className="h-3.5 w-3.5" />}
            active={filters.stars !== 'all'}
            isOpen={openDropdown === 'rating'}
            onToggle={() => toggleDropdown('rating')}
            onClose={() => setOpenDropdown(null)}
            darkMode={darkMode} width="w-48"
          >
            <FilterOption label="Any rating" selected={filters.stars === 'all'} darkMode={darkMode}
              onClick={() => { setFilters(prev => ({ ...prev, stars: 'all' })); setOpenDropdown(null); }} />
            {RATING_OPTIONS.map(opt => (
              <FilterOption key={opt.id} label={opt.label} selected={filters.stars === opt.id} darkMode={darkMode}
                onClick={() => { setFilters(prev => ({ ...prev, stars: opt.id })); setOpenDropdown(null); }} />
            ))}
          </FilterDropdown>

          <FilterDropdown
            label="Duration" icon={<Clock className="h-3.5 w-3.5" />}
            active={filters.duration !== 'all'}
            isOpen={openDropdown === 'duration'}
            onToggle={() => toggleDropdown('duration')}
            onClose={() => setOpenDropdown(null)}
            darkMode={darkMode} width="w-48"
          >
            <FilterOption label="Any length" selected={filters.duration === 'all'} darkMode={darkMode}
              onClick={() => { setFilters(prev => ({ ...prev, duration: 'all' })); setOpenDropdown(null); }} />
            {DURATION_OPTIONS.map(opt => (
              <FilterOption key={opt.id} label={opt.label} selected={filters.duration === opt.id} darkMode={darkMode}
                onClick={() => { setFilters(prev => ({ ...prev, duration: opt.id })); setOpenDropdown(null); }} />
            ))}
          </FilterDropdown>

          <FilterDropdown
            label="Price" icon={<span className="text-xs font-bold">$</span>}
            active={filters.priceRange.min > 0 || filters.priceRange.max < priceCeil}
            isOpen={openDropdown === 'price'}
            onToggle={() => toggleDropdown('price')}
            onClose={() => setOpenDropdown(null)}
            darkMode={darkMode} width="w-72"
          >
            <div className="space-y-3 px-1 py-1">
              <div className="flex justify-between text-sm font-semibold">
                <span>${filters.priceRange.min.toLocaleString()}</span>
                <span>${filters.priceRange.max.toLocaleString()}</span>
              </div>
              <div className="space-y-2">
                <input type="range" min={0} max={priceCeil} value={filters.priceRange.min}
                  onChange={(e) => setFilters(prev => ({ ...prev, priceRange: { ...prev.priceRange, min: Math.min(parseInt(e.target.value), prev.priceRange.max) } }))}
                  className="w-full accent-emerald-600" />
                <input type="range" min={0} max={priceCeil} value={filters.priceRange.max}
                  onChange={(e) => setFilters(prev => ({ ...prev, priceRange: { ...prev.priceRange, max: Math.max(parseInt(e.target.value), prev.priceRange.min) } }))}
                  className="w-full accent-emerald-600" />
              </div>
            </div>
          </FilterDropdown>

          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold text-red-500 border border-red-200 hover:bg-red-50">
              <X className="h-3.5 w-3.5" /> Clear all
            </button>
          )}

          <div className="flex-1" />

          <div className="relative flex-shrink-0">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={`appearance-none pl-3 pr-7 py-2 rounded-xl border text-sm font-semibold cursor-pointer ${
              sortBy !== 'newest' ? 'bg-emerald-600 text-white border-emerald-600' : darkMode ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-white text-gray-700 border-gray-300'
            }`}>
              <option value="newest">Latest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
              <option value="duration">Shortest Duration</option>
            </select>
            <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none ${sortBy !== 'newest' ? 'text-white' : ''}`} />
          </div>
        </div>

        {/* Mobile filter trigger — a single button opens the full sheet
            below, instead of a horizontally-scrolling wall of pills. */}
        <div className="flex lg:hidden items-center gap-2">
          <button onClick={() => setShowMobileFilters(true)} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-semibold ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'} shadow-sm`}>
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && <span className="w-4 h-4 bg-emerald-600 text-white text-[10px] rounded-full flex items-center justify-center">{activeFilterCount}</span>}
          </button>

          <div className="relative flex-shrink-0">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={`appearance-none pl-3 pr-7 py-2.5 rounded-xl border text-sm font-semibold cursor-pointer ${
              sortBy !== 'newest' ? 'bg-emerald-600 text-white border-emerald-600' : darkMode ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-white text-gray-700 border-gray-300'
            }`}>
              <option value="newest">Latest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
              <option value="duration">Shortest Duration</option>
            </select>
            <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none ${sortBy !== 'newest' ? 'text-white' : ''}`} />
          </div>
        </div>

        {/* Active-filter chips — only appear once something is actually
            selected, keeping the bar itself calm by default. */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {activeChips.map(chip => (
              <span key={chip.key} className={`inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-semibold ${darkMode ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}>
                {chip.label}
                <button onClick={chip.onRemove} className="p-0.5 rounded-full hover:bg-black/10">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button onClick={clearFilters} className={`text-xs font-semibold underline ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
              Clear all
            </button>
          </div>
        )}

        <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <span className="font-semibold text-emerald-600">{filteredAndSorted.length}</span> packages found
        </p>
      </div>

      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowMobileFilters(false)} />
          <div className={`fixed right-0 top-0 bottom-0 w-80 max-w-[90vw] overflow-y-auto shadow-2xl ${darkMode ? 'bg-gray-900 text-white' : 'bg-white'}`}>
            <div className={`sticky top-0 p-4 border-b flex items-center justify-between bg-inherit ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
              <h3 className="font-bold text-lg">Filters</h3>
              <button onClick={() => setShowMobileFilters(false)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Trip type</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'all', label: 'All trips' },
                    { id: 'umrah', label: '🕌 Umrah' },
                    { id: 'hajj', label: '🏕 Hajj' },
                  ].map(opt => (
                    <button key={opt.id} onClick={() => setFilters(prev => ({ ...prev, type: opt.id }))}
                      className={`px-3 py-2 rounded-xl text-sm font-semibold border ${
                        filters.type === opt.id ? 'bg-emerald-600 text-white border-emerald-600' : darkMode ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-white text-gray-700 border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Locations</label>
                <div className="flex flex-wrap gap-2">
                  {LOCATION_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setFilters(prev => ({ ...prev, location: prev.location === opt.id ? 'all' : opt.id }))}
                      className={`px-3 py-2 rounded-xl text-sm font-semibold border ${
                        filters.location === opt.id ? 'bg-emerald-600 text-white border-emerald-600' : darkMode ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-white text-gray-700 border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Rating</label>
                <div className="flex flex-wrap gap-2">
                  {RATING_OPTIONS.map(opt => (
                    <button key={opt.id} onClick={() => setFilters(prev => ({ ...prev, stars: prev.stars === opt.id ? 'all' : opt.id }))}
                      className={`px-3 py-2 rounded-xl text-sm font-semibold border flex items-center gap-1 ${
                        filters.stars === opt.id ? 'bg-emerald-600 text-white border-emerald-600' : darkMode ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-white text-gray-700 border-gray-300'
                      }`}
                    >
                      <Star className="h-3 w-3 fill-current" /> {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Duration</label>
                <div className="flex flex-wrap gap-2">
                  {DURATION_OPTIONS.map(opt => (
                    <button key={opt.id} onClick={() => setFilters(prev => ({ ...prev, duration: prev.duration === opt.id ? 'all' : opt.id }))}
                      className={`px-3 py-2 rounded-xl text-sm font-semibold border ${
                        filters.duration === opt.id ? 'bg-emerald-600 text-white border-emerald-600' : darkMode ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-white text-gray-700 border-gray-300'
                      }`}
                    >
                      ⏱ {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Price range</label>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>${filters.priceRange.min.toLocaleString()}</span>
                    <span>${filters.priceRange.max.toLocaleString()}</span>
                  </div>
                  <input type="range" min={0} max={priceCeil} value={filters.priceRange.min} onChange={(e) => setFilters(prev => ({ ...prev, priceRange: { ...prev.priceRange, min: Math.min(parseInt(e.target.value), prev.priceRange.max) } }))} className="w-full accent-emerald-600" />
                  <input type="range" min={0} max={priceCeil} value={filters.priceRange.max} onChange={(e) => setFilters(prev => ({ ...prev, priceRange: { ...prev.priceRange, max: Math.max(parseInt(e.target.value), prev.priceRange.min) } }))} className="w-full accent-emerald-600" />
                </div>
              </div>

              <div className="flex gap-2">
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className={`flex-1 py-3 font-semibold rounded-xl border ${darkMode ? 'border-gray-700 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                    Clear all
                  </button>
                )}
                <button onClick={() => setShowMobileFilters(false)} className="flex-1 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700">
                  Show {filteredAndSorted.length} results
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {filteredAndSorted.length === 0 ? (
        <div className={`text-center py-16 rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className={`font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>No packages found</p>
          <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Try adjusting your filters</p>
          <button onClick={clearFilters} className="px-5 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700">Clear Filters</button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {filteredAndSorted.map(pkg => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              darkMode={darkMode}
              onView={onPackageSelect || (p => navigate(`/package/${p.id}`))}
              onBook={onBook || (p => navigate(`/package/${p.id}`))}
              isFav={favorites.some(f => String(f.id) === String(pkg.id))}
              onToggleFav={onToggleFav}
              isBooked={isPackageBooked(pkg.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAndSorted.map(pkg => (
            <div key={pkg.id} onClick={() => onPackageSelect?.(pkg) || navigate(`/package/${pkg.id}`)} className={`flex rounded-2xl overflow-hidden border cursor-pointer transition-all hover:shadow-md ${
              darkMode ? 'bg-gray-800 border-gray-700 hover:border-emerald-600' : 'bg-white border-gray-100 hover:border-emerald-300'
            }`}>
              <div className="w-32 h-28 flex-shrink-0 overflow-hidden relative">
                <img src={pkg.image} alt={pkg.name} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="flex-1 p-3.5 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className={`font-semibold text-sm truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{pkg.name}</h3>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-emerald-600 font-bold text-sm">${(pkg.price || 0).toLocaleString()}</span>
                    {onToggleFav && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleFav(pkg); }}
                        className={`p-1 rounded-full transition-colors ${
                          favorites.some(f => String(f.id) === String(pkg.id))
                            ? 'text-red-500'
                            : darkMode ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'
                        }`}
                        title={favorites.some(f => String(f.id) === String(pkg.id)) ? 'Remove from favourites' : 'Save to favourites'}
                      >
                        <Heart className={`h-4 w-4 ${favorites.some(f => String(f.id) === String(pkg.id)) ? 'fill-current' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mb-1.5">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {formatLocation(pkg.location)}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {pkg.duration}d</span>
                  <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-400 fill-current" /> {pkg.rating}★</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${pkg.type === 'hajj' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{pkg.type?.toUpperCase()}</span>
                </div>
                {pkg.description && <p className={`text-xs line-clamp-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{pkg.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== WHATSAPP-STYLE MESSAGES VIEW ====================
const MessagesView = ({ bookings, user, darkMode, onExplore }) => {
  const [selectedBooking, setSelectedBooking] = useState(null);

  // On mobile, when a chat is selected it goes full-screen; back button returns to list
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 'bg-emerald-100 text-emerald-700';
      case 'pending':   return 'bg-amber-100 text-amber-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default:          return 'bg-gray-100 text-gray-600';
    }
  };

  if (bookings.length === 0) {
    return (
      <div className={`rounded-2xl border p-12 text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className={`font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>No active bookings</p>
        <p className="text-sm text-gray-400 mb-4">Book a package to start messaging with agents</p>
        <button onClick={onExplore} className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700">Explore Packages</button>
      </div>
    );
  }

  // ── Conversation list item ────────────────────────────────────────────────
  const ConversationItem = ({ booking }) => {
    const pkgName  = booking.package?.name || 'Umrah Package';
    const agentName = booking.package?.agent_name || booking.agency_name || 'Travel Agent';
    const isSelected = selectedBooking?.id === booking.id;
    const initial = agentName.charAt(0).toUpperCase();

    return (
      <button
        onClick={() => setSelectedBooking(booking)}
        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b last:border-b-0
          ${isSelected
            ? darkMode ? 'bg-emerald-900/40 border-l-2 border-l-emerald-500' : 'bg-emerald-50 border-l-2 border-l-emerald-500'
            : darkMode ? 'hover:bg-gray-700/50 border-gray-700' : 'hover:bg-gray-50 border-gray-100'
          }`}
      >
        {/* Avatar */}
        <div className={`w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-base font-bold
          ${darkMode ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
          {initial}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className={`font-semibold text-sm truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {agentName}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${getStatusColor(booking.status)}`}>
              {booking.status?.toUpperCase()}
            </span>
          </div>
          <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {pkgName}
          </p>
        </div>

        {/* Chevron */}
        <ChevronRight className={`h-4 w-4 flex-shrink-0 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
      </button>
    );
  };

  // ── Chat pane header ──────────────────────────────────────────────────────
  const ChatHeader = () => {
    if (!selectedBooking) return null;
    const agentName = selectedBooking.package?.agent_name || selectedBooking.agency_name || 'Travel Agent';
    const pkgName   = selectedBooking.package?.name || 'Umrah Package';
    return (
      <div className={`flex items-center gap-3 px-4 py-3 border-b flex-shrink-0
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        {/* Back button — visible on mobile only */}
        <button
          onClick={() => setSelectedBooking(null)}
          className={`md:hidden p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
          ${darkMode ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
          {agentName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm leading-tight truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {agentName}
          </p>
          <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {pkgName}
          </p>
        </div>
      </div>
    );
  };

  // ── Empty chat placeholder ────────────────────────────────────────────────
  const EmptyChat = () => (
    <div className={`flex-1 flex flex-col items-center justify-center gap-3 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-gray-800' : 'bg-emerald-50'}`}>
        <MessageCircle className={`h-10 w-10 ${darkMode ? 'text-gray-600' : 'text-emerald-300'}`} />
      </div>
      <p className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Select a conversation</p>
      <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Choose a booking from the left to open the chat</p>
    </div>
  );

  return (
    <div className={`rounded-2xl border overflow-hidden flex
      ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
      h-[calc(100vh-10rem)] min-h-[500px]`}
    >
      {/* ── Left pane: conversation list ── */}
      <div className={`
        flex-shrink-0 border-r flex flex-col
        ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}
        ${selectedBooking ? 'hidden md:flex md:w-72 lg:w-80' : 'flex w-full md:w-72 lg:w-80'}
      `}>
        {/* List header */}
        <div className={`px-4 py-3.5 border-b flex-shrink-0 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <h2 className={`font-bold text-base ${darkMode ? 'text-white' : 'text-gray-900'}`}>Messages</h2>
          <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{bookings.length} conversation{bookings.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto">
          {bookings.map(booking => (
            <ConversationItem key={booking.id} booking={booking} />
          ))}
        </div>
      </div>

      {/* ── Right pane: chat ── */}
      <div className={`
        flex-1 flex flex-col min-w-0
        ${!selectedBooking ? 'hidden md:flex' : 'flex'}
      `}>
        {selectedBooking ? (
          <>
            <ChatHeader />
            <div className="flex-1 min-h-0">
              <MessagesPanel
                booking={selectedBooking}
                currentUserId={user?.id}
                darkMode={darkMode}
                fullHeight
              />
            </div>
          </>
        ) : (
          <EmptyChat />
        )}
      </div>
    </div>
  );
};

// ==================== MAIN CLIENT DASHBOARD ====================
const ClientDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState(() => {
    // If user was just redirected back from a successful payment, land on bookings
    if (sessionStorage.getItem('booking_just_confirmed')) {
      sessionStorage.removeItem('booking_just_confirmed');
      return 'bookings';
    }
    return 'packages';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [bookings, setBookings] = useState([]);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState({ bookings: true, messages: true, favorites: true, stats: true });
  const [stats, setStats] = useState({ activeBookings: 0, favorites: 0, pastJourneys: 0, rewardPoints: 0 });

  const { packages: availablePackages, loading: packagesLoading, error: packagesError, refetch: refetchPackages } = usePackages(showToast);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // ── Session guard: redirect to login if user disappears (token expired) ────
  // isMounted ref prevents a false redirect on the very first render before
  // App.jsx's initAuth() has resolved and passed the user prop down.
  const isMounted = React.useRef(false);
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return; // skip first render — user prop may not be set yet
    }
    if (!user?.id) {
      navigate('/', { replace: true });
    }
  }, [user?.id, navigate]);

    // If there's no user, immediately clear loading states so nothing spins forever
  useEffect(() => {
    if (!user?.id) {
      setLoading({ bookings: false, messages: false, favorites: false, stats: false });
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    // ── Fetch favourites from backend ─────────────────────────────────────────
    const fetchFavourites = async () => {
      try {
        const favData = await getFavourites();
        // Backend returns: { success, favourites: Package[], packageIds: string[] }
        const rawFavs = favData.favourites ?? [];
        const favList = rawFavs.map(normalise);
        setFavorites(favList);
        setStats(prev => ({ ...prev, favorites: favList.length }));
      } catch (err) {
        console.error('[fetchFavourites]', err.message);
        showToast('Failed to load favourites', 'error');
      } finally {
        setLoading(prev => ({ ...prev, favorites: false, stats: false }));
      }
    };

    // ── Fetch bookings from backend ───────────────────────────────────────────
    const fetchBookings = async () => {
      try {
        const res = await request({ method: 'get', url: '/bookings/my' });
        const raw = res?.data?.bookings ?? [];
        setBookings(raw);
        // Update stats: active = confirmed/pending, past = completed
        const active = raw.filter(b => ['confirmed', 'pending'].includes(b.status?.toLowerCase())).length;
        const past   = raw.filter(b => b.status?.toLowerCase() === 'completed').length;
        const rewardPoints = computeRewardPoints(raw);
        setStats(prev => ({ ...prev, activeBookings: active, pastJourneys: past, rewardPoints }));

        // Await face-photo check so we have the missing set before loading.bookings
        // is set to false — this prevents the auto-popup useEffect from running
        // against an empty set due to a race condition.
        try {
          const fpRes = await request({ method: 'get', url: '/passport/face-photo-status' });
          const missing = fpRes?.data?.bookingsMissingPhoto ?? [];
          const missingIds = new Set(missing.map((m) => m.bookingId));
          setBookingsMissingPhoto(missingIds);

          // Auto-popup: if this is the first load and any active booking needs a
          // photo, open FacePhotoModal immediately without waiting for a button click.
          if (!autoPhotoPromptShown.current && missingIds.size > 0) {
            const target = raw.find(
              (b) =>
                ['confirmed', 'pending'].includes(b.status?.toLowerCase()) &&
                missingIds.has(b.id)
            );
            if (target) {
              autoPhotoPromptShown.current = true;
              setFacePhotoBooking({
                bookingId: target.id,
                packageId: target.package_id ?? target.package?.id,
                pkg:       target.package ?? { id: target.package_id, title: target.package?.name ?? 'Umrah Package' },
              });
            }
          }
        } catch (fpErr) {
          console.warn('[fetchBookings] face-photo-status check failed:', fpErr.message);
        }
      } catch (err) {
        console.error('[fetchBookings]', err.message);
        showToast('Could not load bookings', 'error');
      } finally {
        setLoading(prev => ({ ...prev, bookings: false }));
      }
    };

    // ── Fetch unread message count ────────────────────────────────────────────
    const fetchUnreadCount = async () => {
      try {
        const res = await request({ method: 'get', url: '/messages/count/unread' });
        setUnreadCount(res?.data?.count ?? 0);
      } catch (err) {
        console.error('[fetchUnreadCount]', err.message);
      } finally {
        setLoading(prev => ({ ...prev, messages: false }));
      }
    };

    fetchFavourites();
    fetchBookings();
    fetchUnreadCount();

    // ── Realtime: increment badge instantly when a new message arrives ────────
    if (!supabase) return;
    const channel = supabase
      .channel(`client-unread-${user.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${user.id}` },
        ({ new: msg }) => {
          if (msg?.sender_id !== user.id) setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, showToast]);

  const menuItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview', count: 0 },
    { id: 'bookings', icon: Calendar, label: 'My Bookings', count: bookings.length },
    { id: 'favorites', icon: Heart, label: 'Favorites', count: favorites.length },
    { id: 'messages', icon: MessageCircle, label: 'Messages', count: unreadCount },
    { id: 'packages', icon: Home, label: 'Discover Packages', count: 0 },
    { id: 'settings', icon: Settings, label: 'Settings', count: 0 }
  ];

  const handleViewPackage = (pkg) => navigate(`/package/${pkg.id}`);
  const handleBookPackage  = (pkg) => {
    // ── Auth guard: never allow booking when session is gone ──
    if (!user?.id) {
      showToast('Your session has expired. Please sign in to book.', 'error');
      setTimeout(() => { onLogout?.(); navigate('/'); }, 1500);
      return;
    }
    // Check if user already has a confirmed or pending booking for this package
    const existingBooking = bookings.find(b => 
      String(b.package_id) === String(pkg.id) && 
      ['confirmed', 'pending'].includes(b.status?.toLowerCase())
    );
    if (existingBooking) {
      showToast('You have already booked this package', 'info');
      return;
    }
    setBookingPkg(pkg);
  };
  const handleViewBooking = (booking) => navigate(`/package/${booking.package_id ?? booking.package?.id}`);

  // isFavourited — checks by id (compare as strings to handle mixed types)
  const isFavourited = (pkgId) =>
    favorites.some(f => String(f.id) === String(pkgId));

  // Unified toggle — works for both adding and removing from any tab
  const handleToggleFavourite = async (pkg) => {
    if (!user?.id) {
      showToast('Please sign in to save favourites', 'info');
      return;
    }
    const alreadySaved = isFavourited(pkg.id);
    const original = [...favorites];

    // Optimistic update
    if (alreadySaved) {
      setFavorites(prev => prev.filter(f => String(f.id) !== String(pkg.id)));
      setStats(prev => ({ ...prev, favorites: Math.max(0, prev.favorites - 1) }));
    } else {
      const normPkg = normalise(pkg);
      setFavorites(prev => [normPkg, ...prev]);
      setStats(prev => ({ ...prev, favorites: prev.favorites + 1 }));
    }

    try {
      await toggleFavourite(pkg.id);
      showToast(alreadySaved ? 'Removed from favourites' : 'Saved to favourites', 'success');
    } catch (err) {
      // Revert on failure
      setFavorites(original);
      setStats(prev => ({ ...prev, favorites: original.length }));
      showToast('Failed to update favourites', 'error');
    }
  };

  // Kept for the explicit "remove" button in the Favorites tab
  const handleUnfavourite = (pkg) => handleToggleFavourite(pkg);

  // ── Booking modal state ──────────────────────────────────────────────────
  const [bookingPkg, setBookingPkg] = useState(null);
  // ── Face-photo modal state (standalone — for returning users) ────────────
  // { bookingId, packageId } of the booking whose Umrah ID photo is missing.
  const [facePhotoBooking, setFacePhotoBooking] = useState(null);

  const [bookingsMissingPhoto, setBookingsMissingPhoto] = useState(new Set());

  // Tracks whether we've already shown the auto-popup this session so it
  // never fires more than once per login, even if bookings refresh.
  const autoPhotoPromptShown = React.useRef(false);

  const checkFacePhotoStatus = useCallback(async () => {
    try {
      const res = await request({ method: 'get', url: '/passport/face-photo-status' });
      const missing = res?.data?.bookingsMissingPhoto ?? [];
      setBookingsMissingPhoto(new Set(missing.map((m) => m.bookingId)));
    } catch (err) {
      console.warn('[checkFacePhotoStatus]', err.message);
      // Non-critical — silently ignore
    }
  }, []);



  const refreshBookings = useCallback(async () => {
    try {
      const res = await request({ method: 'get', url: '/bookings/my' });
      const raw = res?.data?.bookings ?? [];
      setBookings(raw);
      const active = raw.filter(b => ['confirmed', 'pending'].includes(b.status?.toLowerCase())).length;
      const past   = raw.filter(b => b.status?.toLowerCase() === 'completed').length;
      const rewardPoints = computeRewardPoints(raw);
      setStats(prev => ({ ...prev, activeBookings: active, pastJourneys: past, rewardPoints }));
    } catch (err) {
      console.error('[refreshBookings]', err.message);
    }
  }, []);

  const handleBookingSuccess = useCallback((_newBooking) => {
    // Keep BookingFlow mounted — FacePhotoModal renders next inside it.
    // onClose() (setBookingPkg(null)) is called by BookingFlow after face photo.
    refreshBookings();
    checkFacePhotoStatus();
    showToast('Package booked successfully! 🎉', 'success');
    setActiveTab('bookings');
  }, [showToast, refreshBookings, checkFacePhotoStatus]);

  const handleLogout = () => {
    localStorage.removeItem('userData');
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('packages_cache');
    localStorage.removeItem('packages_cache_time');
    userStore.clear();
    onLogout?.();
    navigate('/');
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
              <h2 className="text-xl sm:text-2xl font-bold mb-2 text-center sm:text-left">Welcome back, {user?.firstName || user?.name || 'Pilgrim'}! 🎉</h2>
              <p className="text-emerald-100 text-sm sm:text-base mb-4">May your journey to the Holy Lands be blessed and fulfilling.</p>
              <button onClick={() => setActiveTab('packages')} className="px-4 py-2 bg-white text-emerald-600 text-sm font-semibold rounded-lg hover:shadow-lg">Explore Packages →</button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Calendar} label="Active Bookings" value={stats.activeBookings || bookings.length} color="from-emerald-500 to-teal-600" darkMode={darkMode} loading={loading.bookings} />
              <StatCard icon={Heart} label="Favorites" value={stats.favorites} color="from-red-500 to-pink-600" darkMode={darkMode} loading={loading.favorites} />
              <StatCard icon={Clock} label="Past Journeys" value={stats.pastJourneys} color="from-blue-500 to-indigo-600" darkMode={darkMode} loading={loading.bookings} />
              <StatCard icon={Award} label="Reward Points" value={stats.rewardPoints.toLocaleString()} color="from-amber-500 to-orange-600" darkMode={darkMode} loading={loading.stats} />
            </div>

            <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Upcoming Journeys</h3>
                <button onClick={() => setActiveTab('bookings')} className="text-emerald-600 text-sm font-medium">View all</button>
              </div>
              <div className="p-4">
                {bookings.length === 0 ? (
                  <div className="text-center py-8"><p className="text-gray-500">No bookings yet</p><button onClick={() => setActiveTab('packages')} className="mt-2 text-emerald-600 text-sm font-medium">Explore packages →</button></div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bookings.slice(0, 2).map(booking => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        darkMode={darkMode}
                        onView={handleViewBooking}
                        onAddPhoto={bookingsMissingPhoto.has(booking.id)
                          ? (b) => setFacePhotoBooking({ bookingId: b.id, packageId: b.package_id ?? b.package?.id, pkg: b.package ?? { id: b.package_id, title: b.package?.name ?? 'Umrah Package' } })
                          : undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Recent Messages</h3>
                <button onClick={() => setActiveTab('messages')} className="text-emerald-600 text-sm font-medium">View all</button>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {messages.length === 0 ? (
                  <div className="text-center py-8"><p className="text-gray-500">No messages yet</p></div>
                ) : (
                  messages.slice(0, 2).map(message => <MessageCard key={message.id} message={message} darkMode={darkMode} />)
                )}
              </div>
            </div>
          </div>
        );

      case 'bookings':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>My Bookings</h2>
              <button
                onClick={refreshBookings}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
              >
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
            </div>
            {loading.bookings ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={`rounded-2xl overflow-hidden border animate-pulse ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <div className={`h-40 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
                    <div className="p-4 space-y-3">
                      <div className={`h-4 rounded w-3/4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
                      <div className={`h-3 rounded w-1/2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
                    </div>
                  </div>
                ))}
              </div>
            ) : bookings.length === 0 ? (
              <div className={`rounded-2xl border p-12 text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className={`font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>No bookings yet</p>
                <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Your confirmed bookings will appear here after payment</p>
                <button onClick={() => setActiveTab('packages')} className="mt-2 px-5 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700">Explore Packages</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bookings.map(booking => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    darkMode={darkMode}
                    onView={handleViewBooking}
                    onAddPhoto={bookingsMissingPhoto.has(booking.id)
                      ? (b) => setFacePhotoBooking({ bookingId: b.id, packageId: b.package_id ?? b.package?.id, pkg: b.package ?? { id: b.package_id, title: b.package?.name ?? 'Umrah Package' } })
                      : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case 'favorites':
        return (
          <div className="space-y-4">
            <h2 className={`text-xl font-bold text-center sm:text-left ${darkMode ? 'text-white' : 'text-gray-900'}`}>Favorite Packages</h2>
            {favorites.length === 0 ? (
              <div className={`rounded-2xl border p-12 text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <Heart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>You haven't saved any packages yet</p>
                <button onClick={() => setActiveTab('packages')} className="mt-4 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700">Explore Packages</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {favorites.map(pkg => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    darkMode={darkMode}
                    onView={handleViewPackage}
                    onBook={handleBookPackage}
                    isFav={true}
                    onToggleFav={handleUnfavourite}
                    isBooked={bookings.some(b => String(b.package_id) === String(pkg.id) && ['confirmed', 'pending'].includes(b.status?.toLowerCase()))}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case 'messages':
        return <MessagesView bookings={bookings} user={user} darkMode={darkMode} onExplore={() => setActiveTab('packages')} />;

      case 'packages':
        return <PackageDiscovery darkMode={darkMode} onPackageSelect={handleViewPackage} onBook={handleBookPackage} packages={availablePackages} loading={packagesLoading} error={packagesError} onRetry={refetchPackages} favorites={favorites} onToggleFav={handleToggleFavourite} bookings={bookings} />;

      case 'settings':
        return (
          <div className="space-y-4">
            <h2 className={`text-xl font-bold text-center sm:text-left ${darkMode ? 'text-white' : 'text-gray-900'}`}>Settings</h2>
            <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="space-y-4">
                <div><label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Full Name</label><input type="text" defaultValue={`${user?.firstName || user?.name || ''} ${user?.lastName || ''}`} className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`} /></div>
                <div><label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email</label><input type="email" defaultValue={user?.email || ''} className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`} /></div>
                <div><label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Dark Mode</label><button onClick={() => setDarkMode(!darkMode)} className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>{darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}{darkMode ? 'Light Mode' : 'Dark Mode'}</button></div>
                <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Save Changes</button>
              </div>
            </div>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {toasts.map(toast => <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />)}

      {/* Mobile Menu Button — now lives inside the header, removed from here */}

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
          <div className={`fixed left-0 top-0 bottom-0 w-80 max-w-[85vw] overflow-y-auto ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold">Menu</h2><button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5" /></button></div>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg">{user?.firstName?.charAt(0) || user?.name?.charAt(0) || 'U'}</div>
                <div><h3 className="font-semibold">{user?.firstName || user?.name || 'User'} {user?.lastName || ''}</h3><p className="text-xs text-gray-500">{user?.email || ''}</p></div>
              </div>
            </div>
            <nav className="p-4">
              {menuItems.map(item => (
                <button key={item.id} onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); if (item.id === 'messages') setUnreadCount(0); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl mb-1 transition-all ${activeTab === item.id ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' : darkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}>
                  <div className="flex items-center space-x-3"><item.icon className="h-5 w-5" /><span className="font-medium">{item.label}</span></div>
                  {item.count > 0 && <span className={`px-2 py-1 rounded-full text-xs ${activeTab === item.id ? 'bg-white/20 text-white' : darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>{item.count}</span>}
                </button>
              ))}
              <button onClick={handleLogout} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl mt-2 transition-colors ${darkMode ? 'text-gray-400 hover:bg-gray-800 hover:text-red-400' : 'text-gray-600 hover:bg-red-50 hover:text-red-600'}`}><LogOut className="h-5 w-5" /><span className="font-medium">Logout</span></button>
            </nav>
          </div>
        </div>
      )}

      {/* Desktop Sidebar — icon-only by default, expands on hover */}
      <div
        className={`hidden lg:flex fixed inset-y-0 left-0 z-30 flex-col transition-all duration-300 ease-in-out group/sidebar
          ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r
          w-16 hover:w-64`}
      >
        {/* User avatar */}
        <div className={`flex items-center px-3 py-5 border-b overflow-hidden ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
              {user?.firstName?.charAt(0) || user?.name?.charAt(0) || 'U'}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
          </div>
          {/* Revealed on hover */}
          <div className="ml-3 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden">
            <p className={`font-semibold text-sm leading-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {user?.firstName || user?.name || 'User'} {user?.lastName || ''}
            </p>
            <p className={`text-xs truncate max-w-[140px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {user?.email || ''}
            </p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-1 px-2">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); if (item.id === 'messages') setUnreadCount(0); }}
              title={item.label}
              className={`w-full flex items-center rounded-xl transition-all duration-200 px-2.5 py-2.5
                ${activeTab === item.id
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                  : darkMode
                    ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className="ml-3 text-sm font-medium whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 overflow-hidden">
                {item.label}
              </span>
              {item.count > 0 && (
                <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200
                  ${activeTab === item.id ? 'bg-white/20 text-white' : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className={`px-2 py-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={handleLogout}
            title="Logout"
            className={`w-full flex items-center px-2.5 py-2.5 rounded-xl transition-colors
              ${darkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-red-400' : 'text-gray-600 hover:bg-red-50 hover:text-red-600'}`}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span className="ml-3 text-sm font-medium whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 overflow-hidden">
              Logout
            </span>
          </button>
        </div>
      </div>

      {/* Main Content — offset by collapsed sidebar width (w-16 = 4rem) */}
      <div className="lg:ml-16">
        <header className={`sticky top-0 z-20 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              {/* Hamburger — only on mobile, inside header so title can account for it */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className={`lg:hidden flex-shrink-0 p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <Menu className={`h-5 w-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
              </button>

              {/* Title — centered on mobile, left-aligned on desktop */}
              <h1 className={`flex-1 text-center lg:text-left text-lg sm:text-xl font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {menuItems.find(item => item.id === activeTab)?.label}
              </h1>

              {/* Right actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                  {darkMode ? <Sun className="h-5 w-5 text-gray-300" /> : <Moon className="h-5 w-5 text-gray-600" />}
                </button>
                <button onClick={() => setShowNotifications(!showNotifications)} className={`p-2 rounded-lg transition-colors relative ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                  <Bell className={`h-5 w-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                </button>
                <div className="hidden sm:flex items-center gap-2 ml-1">
                  <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{user?.firstName || user?.name || 'User'}</span>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
                    {user?.firstName?.charAt(0) || user?.name?.charAt(0) || 'U'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{renderContent()}</main>
        <footer className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-4">
          <div className="flex items-center justify-around">
            {menuItems.slice(0, 4).map(item => (
              <button key={item.id} onClick={() => { setActiveTab(item.id); if (item.id === 'messages') setUnreadCount(0); }} className={`flex flex-col items-center p-2 relative ${activeTab === item.id ? 'text-emerald-600' : 'text-gray-500'}`}>
                <item.icon className="h-5 w-5" /><span className="text-xs mt-1">{item.label}</span>
                {item.count > 0 && <span className="absolute -top-1 right-0 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{item.count}</span>}
              </button>
            ))}
          </div>
        </footer>
        <div className="lg:hidden h-16"></div>
      </div>

      {/* ── Booking Modal ── */}
      {bookingPkg && (
        <BookingFlow
          pkg={bookingPkg}
          user={user}
          onClose={() => setBookingPkg(null)}
          onSuccess={handleBookingSuccess}
        />
      )}

      {/* ── Standalone Face-Photo Modal ─────────────────────────────────────
           Shown when a returning user opens "My Bookings" and one or more
           confirmed/pending bookings still has no Umrah ID photo on file.
           Triggered by the "Add Umrah ID Photo" button on BookingCard.
      ── */}
      {facePhotoBooking && (
        <FacePhotoModal
          pkg={facePhotoBooking.pkg}
          onDone={() => {
            setFacePhotoBooking(null);
            // Remove this booking from the missing-set so the nudge disappears
            setBookingsMissingPhoto(prev => {
              const next = new Set(prev);
              next.delete(facePhotoBooking.bookingId);
              return next;
            });
          }}
        />
      )}
    </div>
  );
};

export default ClientDashboard;