import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Heart, Share2, Star, Shield, CheckCircle,
  MapPin, Calendar, Users, Hotel, Clock, DollarSign,
  Wifi, Coffee, Car, Dumbbell, Utensils, Tv, Wind,
  Droplets, Bed, Bath, Users as UsersIcon, Maximize2,
  Minus, Plus, Phone, Mail, CreditCard,
  Lock, User, Globe, Info, X, Loader2, AlertCircle
} from 'lucide-react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { userStore, tokenStore } from '../api';
import { getItinerary, getPackageById, normalise } from './agent/packages/services/packagesApi';
import AuthModal from './AuthModal';
import BookingFlow from './BookingFlow';
import PackageVisitTracker from '../visits/PackageVisitTracker';
// ─────────────────────────────────────────────────────────────────────────────
// GalleryCarousel
// ─────────────────────────────────────────────────────────────────────────────
const GalleryCarousel = ({ images, title }) => {
  const [current,  setCurrent]  = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const autoRef    = useRef(null);
  const thumbsRef  = useRef(null);
  const total      = images.length;

  // go() uses functional setCurrent so it never needs `current` in deps
  // — this prevents the interval from re-creating every slide change
  const go = useCallback((idx) => {
    setCurrent(c => {
      const next = ((typeof idx === 'function' ? idx(c) : idx) + total) % total;
      return next;
    });
  }, [total]);

  const prev = useCallback(() => go(c => c - 1), [go]);
  const next = useCallback(() => go(c => c + 1), [go]);

  // Auto-advance — stable interval, never recreated
  const startAuto = useCallback(() => {
    clearInterval(autoRef.current);
    autoRef.current = setInterval(() => go(c => c + 1), 4000);
  }, [go]);
  const stopAuto = useCallback(() => clearInterval(autoRef.current), []);

  useEffect(() => { startAuto(); return stopAuto; }, [startAuto, stopAuto]);

  // Keyboard navigation in lightbox
  useEffect(() => {
    if (!lightbox) return;
    const handler = (e) => {
      if (e.key === 'ArrowLeft')  prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape')     setLightbox(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox, prev, next]);

  // Scroll ONLY the thumbnail container — never the page
  useEffect(() => {
    const strip = thumbsRef.current;
    if (!strip) return;
    const active = strip.querySelector('[data-active="true"]');
    if (!active) return;
    const stripLeft   = strip.getBoundingClientRect().left;
    const activeLeft  = active.getBoundingClientRect().left;
    const activeRight = active.getBoundingClientRect().right;
    const stripRight  = strip.getBoundingClientRect().right;
    if (activeLeft < stripLeft + 8) {
      strip.scrollBy({ left: activeLeft - stripLeft - 8, behavior: 'smooth' });
    } else if (activeRight > stripRight - 8) {
      strip.scrollBy({ left: activeRight - stripRight + 8, behavior: 'smooth' });
    }
  }, [current]);

  if (total === 0) return null;

  return (
    <>
      <div className="mb-8" onMouseEnter={stopAuto} onMouseLeave={startAuto}>

        {/* ── Main slide — explicit fixed heights, never reflows ── */}
        <div className="relative w-full rounded-2xl overflow-hidden bg-gray-100 h-52 sm:h-72 md:h-96 lg:h-[420px]">

          {images.map((src, i) => (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-500"
              style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}
            >
              {/* Blurred backdrop — a zoomed, softened copy of the same photo
                  fills the whole frame, so portrait/odd-aspect photos never
                  leave flat gray/white bars beside them. */}
              <img
                src={src}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60"
              />
              <div className="absolute inset-0 bg-black/20" />
              {/* Actual photo — always shown in full, never cropped. */}
              <img
                src={src}
                alt={`${title} – photo ${i + 1}`}
                className="relative w-full h-full object-contain"
              />
            </div>
          ))}

          {/* Subtle bottom gradient */}
          <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none h-16"
               style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)' }} />

          {/* Prev / Next */}
          {total > 1 && (
            <>
              <button onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-sm transition-all duration-200 hover:scale-110">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-sm transition-all duration-200 hover:scale-110">
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Counter + expand */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            {total > 1 && (
              <span className="bg-black/50 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                {current + 1} / {total}
              </span>
            )}
            <button onClick={() => setLightbox(true)}
              className="bg-black/50 backdrop-blur-sm text-white p-1.5 rounded-lg hover:bg-black/70 transition">
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>

          {/* Dot indicators (mobile) */}
          {total > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 sm:hidden">
              {images.map((_, i) => (
                <button key={i} onClick={() => go(i)}
                  className={`rounded-full transition-all duration-300 ${i === current ? 'bg-white w-5 h-1.5' : 'bg-white/50 w-1.5 h-1.5'}`} />
              ))}
            </div>
          )}
        </div>

        {/* ── Thumbnail strip ── */}
        {total > 1 && (
          <div ref={thumbsRef}
            className="mt-2 flex gap-2 overflow-x-auto pb-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {images.map((src, i) => (
              <button
                key={i}
                data-active={i === current ? 'true' : 'false'}
                onClick={() => go(i)}
                className={`flex-shrink-0 rounded-xl overflow-hidden transition-all duration-200 ${
                  i === current
                    ? 'ring-2 ring-emerald-500 ring-offset-1 opacity-100 scale-105'
                    : 'opacity-60 hover:opacity-90'
                }`}
                style={{ width: '80px', height: '56px' }}>
                <img src={src} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4"
             onClick={() => setLightbox(false)}>
          <button onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition">
            <X className="h-5 w-5" />
          </button>

          <div className="relative w-full max-w-4xl" onClick={e => e.stopPropagation()}>
            <img src={images[current]} alt={`${title} – photo ${current + 1}`}
              className="w-full max-h-[75vh] object-contain rounded-xl" />

            {total > 1 && (
              <>
                <button onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          <p className="text-white/60 text-sm mt-4">{current + 1} / {total} · Press ← → to navigate · Esc to close</p>

          {total > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto max-w-lg" onClick={e => e.stopPropagation()}>
              {images.map((src, i) => (
                <button key={i} onClick={() => go(i)}
                  className={`flex-shrink-0 rounded-lg overflow-hidden transition-all ${i === current ? 'ring-2 ring-emerald-400 opacity-100' : 'opacity-40 hover:opacity-70'}`}
                  style={{ width: '60px', height: '42px' }}>
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const PackageDetailPage = ({ packages = [], loading = false, favorites = [], toggleFavorite, currentUser, onBook, onAuthSuccess }) => {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const location  = useLocation();

  const handleBack = () => {
    const user = currentUser || userStore.get();
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(user?.role === 'client' ? '/client/dashboard' : user?.role === 'agent' ? '/agent/dashboard' : '/');
    }
  };

  // Find the package from the already-loaded list
  const preloadedPkg = useMemo(() => packages.find(p => p.id === id) ?? null, [packages, id]);

  // Fallback: not every package is in the preloaded `packages` list — it's
  // typically only Active/public ones. An agent opening "Details" on their
  // own Draft/Inactive package, or anyone following a direct link before the
  // app-level list has loaded, would otherwise hit "Package not found" even
  // though the package exists. Fetch it directly in that case.
  const [fetchedPkg, setFetchedPkg]     = useState(null);
  const [fallbackState, setFallbackState] = useState('idle'); // idle | loading | done | error

  useEffect(() => {
    setFetchedPkg(null);
    setFallbackState('idle');
    if (!id || preloadedPkg) return;

    let cancelled = false;
    setFallbackState('loading');
    getPackageById(id)
      .then((res) => {
        if (cancelled) return;
        const raw = res?.package || res;
        setFetchedPkg(raw ? normalise(raw) : null);
        setFallbackState('done');
      })
      .catch(() => {
        if (!cancelled) setFallbackState('error');
      });

    return () => { cancelled = true; };
  }, [id, preloadedPkg]);

  const packageData = preloadedPkg ?? fetchedPkg;
  const readOnlyFromBooking = Boolean(location.state?.fromBooking);
  const bookingContext = location.state?.booking ?? null;

  // Scroll to top whenever the viewed package changes
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [id]);

  // Fetch itinerary from backend
  const [itineraryDays, setItineraryDays] = useState(null);
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getItinerary(id)
      .then((data) => { if (!cancelled && Array.isArray(data?.days) && data.days.length) setItineraryDays(data.days); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  // Similar packages — same type or location, excluding current
  const similarPkgs = useMemo(
    () => packages.filter(p => p.id !== id && (p.type === packageData?.type || p.location === packageData?.location)).slice(0, 3),
    [packages, id, packageData]
  );

  // ── Normalise images — guard against missing/undefined images array ─────────
  const safeImages = useMemo(() => {
    if (!packageData) return [];
    const imgs = packageData.images;
    if (Array.isArray(imgs) && imgs.length > 0) return imgs;
    if (packageData.image) return [packageData.image];
    return ['https://images.unsplash.com/photo-1564769662533-4f00a87b4056?auto=format&fit=crop&w=800&q=80'];
  }, [packageData]);

  // ── Share ───────────────────────────────────────────────────────────────────
  const [shareCopied, setShareCopied] = useState(false);

  const handleShare = useCallback(async () => {
    if (!packageData) return;

    const shareUrl = `${window.location.origin}/package/${packageData.id}`;

    const priceLine = packageData.price ? `from $${formatPrice(packageData.price)}/person` : '';
    const metaBits = [
      packageData.duration ? `${packageData.duration}d` : null,
      packageData.distance || null,
      packageData.hotelRating ? `${packageData.hotelRating} Hotel` : null,
    ].filter(Boolean).join(' · ');

    const shareText = [
      `${packageData.title || 'Umrah Package'}${priceLine ? ` — ${priceLine}` : ''}`,
      metaBits,
      packageData.agent_name ? `by ${packageData.agent_name}` : null,
    ].filter(Boolean).join('\n');

    const shareData = { title: packageData.title || 'Umrah Package', text: shareText, url: shareUrl };

    // Native share sheet (mobile browsers, some desktop browsers)
    if (navigator.share) {
      try {
        if (!navigator.canShare || navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return;
        }
      } catch (err) {
        // User cancelled the share sheet — don't fall through to clipboard
        if (err?.name === 'AbortError') return;
      }
    }

    // Fallback: copy a shareable message + link to clipboard
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (err) {
      console.error('[handleShare] clipboard fallback failed', err);
      window.prompt('Copy this link:', shareUrl); // last-resort fallback
    }
  }, [packageData]);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingPkg,      setBookingPkg]      = useState(null);
  const [showAuthModal,    setShowAuthModal]    = useState(false);
  const [payStep,          setPayStep]          = useState('select');   // 'select' | 'card' | 'mpesa' | 'mpesa-pin' | 'bank' | 'processing' | 'done'
  const [payMethod,        setPayMethod]        = useState(null);
  const [cardInfo,         setCardInfo]         = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [mpesaPhone,       setMpesaPhone]       = useState('');
  const [mpesaPin,         setMpesaPin]         = useState(['', '', '', '']);
  const [guests,           setGuests]           = useState({ adults: 1, children: 0 });

  const pinRefs = [useRef(), useRef(), useRef(), useRef()];

  // Stores the fact that a guest tried to favourite this package before being
  // sent to login — mirrors HeroSection's pendingFavouriteId pattern so the
  // action resumes automatically once they authenticate.
  const pendingFavouriteRef = useRef(false);

  const closeModal = () => { setShowBookingModal(false); setPayStep('select'); setPayMethod(null); setCardInfo({ number: '', expiry: '', cvc: '', name: '' }); setMpesaPhone(''); setMpesaPin(['', '', '', '']); };

  // When onBook prop is provided (from ClientDashboard), delegate upward.
  // When used standalone (direct URL), open the local BookingModal.
  const openBooking = (pkg) => {
    if (onBook) {
      onBook(pkg);
    } else {
      setBookingPkg(pkg);
    }
  };
  // Single source of truth for auth state on this page — used by every
  // "Book Now" / favourite click so the check can never drift between spots.
  const isLoggedIn = () => !!(currentUser || userStore.get() || tokenStore.get());
  const formatPrice  = (p) => Number(p).toLocaleString('en-US');
  const calculateTotal = () => !packageData ? 0 : guests.adults * packageData.price + guests.children * packageData.price * 0.5;

  const getAge = (rawDob) => {
    if (!rawDob) return null;
    const dob = new Date(rawDob);
    if (Number.isNaN(dob.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age -= 1;
    return age >= 0 ? age : null;
  };

  const bookedTravelers = useMemo(() => {
    const b = bookingContext ?? {};
    const travelers = [
      b.traveler_details,
      b.travelerDetails,
      b.travelers,
      b.passengers,
      b.clients,
      b.people,
      b.passport_verifications,
      b.passportVerifications,
    ].find((v) => Array.isArray(v)) ?? [];

    return travelers.slice(0, 12).map((t, index) => {
      const given = t?.given_names ?? t?.givenNames ?? t?.first_name ?? t?.firstName ?? '';
      const surname = t?.surname ?? t?.last_name ?? t?.lastName ?? '';
      const name = (t?.full_name ?? t?.fullName ?? t?.name ?? `${given} ${surname}`.trim()) || `Traveler ${index + 1}`;
      const dob = t?.date_of_birth ?? t?.dateOfBirth ?? t?.dob ?? null;
      const passportNumber = t?.passport_number ?? t?.passportNumber ?? null;
      return {
        id: t?.id ?? t?.traveler_id ?? t?.travelerIndex ?? index,
        name,
        dateOfBirth: dob,
        age: getAge(dob),
        passportNumber,
      };
    });
  }, [bookingContext]);

  // Format card number with spaces
  const fmtCard = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  // Format expiry MM/YY
  const fmtExpiry = (v) => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? `${d.slice(0,2)}/${d.slice(2)}` : d; };

  // M-Pesa PIN input handler
  const handlePinInput = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...mpesaPin]; next[i] = val;
    setMpesaPin(next);
    if (val && i < 3) pinRefs[i + 1].current?.focus();
  };
  const handlePinKey = (i, e) => {
    if (e.key === 'Backspace' && !mpesaPin[i] && i > 0) pinRefs[i - 1].current?.focus();
  };

  const simulatePayment = () => {
    setPayMethod(payStep === 'mpesa-pin' ? 'mpesa' : payStep);
    setPayStep('processing');
    setTimeout(() => setPayStep('done'), 3000);
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────

  // ── Static display data ──────────────────────────────────────────────────────
  const amenities = [
    { icon: <Wifi className="h-5 w-5" />,       label: 'Free High-Speed WiFi' },
    { icon: <Coffee className="h-5 w-5" />,     label: 'Complimentary Breakfast' },
    { icon: <Car className="h-5 w-5" />,        label: '24/7 Airport Transfer' },
    { icon: <Dumbbell className="h-5 w-5" />,   label: 'Fitness Center' },
    { icon: <Utensils className="h-5 w-5" />,   label: 'Halal Restaurant' },
    { icon: <Tv className="h-5 w-5" />,         label: 'Smart TV with Quran Channels' },
    { icon: <Wind className="h-5 w-5" />,       label: 'Air Conditioning' },
    { icon: <Droplets className="h-5 w-5" />,   label: 'Prayer Mats & Quran' },
    { icon: <Bed className="h-5 w-5" />,        label: 'Premium Bedding' },
    { icon: <Bath className="h-5 w-5" />,       label: 'Luxury Bathroom Amenities' },
    { icon: <Shield className="h-5 w-5" />,     label: '24/7 Security & CCTV' },
    { icon: <UsersIcon className="h-5 w-5" />,  label: 'Family Rooms Available' },
  ];

  const itinerary = itineraryDays ?? [
    { day: 1, title: 'Arrival in Jeddah',    activities: ['Airport Pickup', 'Hotel Check-in', 'Welcome Dinner'] },
    { day: 2, title: 'Umrah Performance',    activities: ['Tawaf', "Sa'i", 'Hair Cutting'] },
    { day: 3, title: 'Ziyarat in Makkah',   activities: ['Jabal al-Nour', 'Hira Cave', 'Masjid al-Jinn'] },
    { day: 4, title: 'Transfer to Madinah', activities: ['Travel to Madinah', 'Hotel Check-in', 'Rawdah Visit'] },
    { day: 5, title: 'Ziyarat in Madinah',  activities: ['Quba Mosque', 'Uhud Mountain', 'Qiblatain Mosque'] },
    { day: 6, title: 'Spiritual Day',        activities: ['Optional Tours', 'Shopping', 'Personal Time'] },
    { day: 7, title: 'Departure',            activities: ['Final Prayers', 'Airport Transfer', 'Departure'] },
  ];

  const reviews = [
    { id: 1, name: 'Ahmed Khan',     avatar: 'AK', rating: 4.9, date: '2 weeks ago', comment: 'Excellent service! The hotel was just 200m from Haram. Highly recommended for first-timers.', verified: true, stay: 'December 2024', helpful: 24 },
    { id: 2, name: 'Fatima Ali',     avatar: 'FA', rating: 4.7, date: '1 month ago', comment: 'Perfect for families. The distance to Haram was exactly as promised.',                          verified: true, stay: 'November 2024', helpful: 18 },
    { id: 3, name: 'Mohammed Yusuf', avatar: 'MY', rating: 5.0, date: '3 days ago',  comment: 'Best Umrah experience ever. Everything was perfectly arranged. Will book again for Hajj.',     verified: true, stay: 'January 2025',  helpful: 32 },
  ];

  // ── Loading (App hasn't finished fetching yet, or we're fetching this
  //    specific package as a fallback) ──────────────────────────────────────
  if (loading || (!packageData && fallbackState === 'loading')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading package details…</p>
        </div>
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────────
  if (!packageData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border border-red-200 rounded-2xl p-10 max-w-sm w-full text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-red-700 mb-4">Package not found</p>
          <button onClick={handleBack} className="text-sm text-emerald-600 hover:underline">
            ← Back to packages
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
    <PackageVisitTracker packageData={packageData} />

      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={handleBack} className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
            <ChevronLeft className="h-5 w-5 mr-1" />
            <span className="hidden sm:inline">Back to packages</span>
          </button>
          <div className="flex items-center space-x-4 relative">
            <button
              onClick={handleShare}
              aria-label="Share this package"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Share2 className="h-5 w-5 text-gray-600" />
            </button>
            {shareCopied && (
              <span className="absolute top-10 right-0 whitespace-nowrap bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-1">
                Link copied!
              </span>
            )}
            <button
              onClick={async () => {
                if (!isLoggedIn()) {
                  pendingFavouriteRef.current = true;
                  setShowAuthModal(true);
                  return;
                }
                try {
                  await toggleFavorite?.(packageData);
                } catch (err) {
                  console.error('[toggleFavorite]', err);
                }
              }}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Heart
                className={`h-5 w-5 ${
                  favorites.some(f => String(f.id) === String(packageData.id))
                    ? 'fill-red-500 text-red-500'
                    : 'text-gray-600'
                }`}
              />
            </button>
            {!readOnlyFromBooking && (
              <button
                onClick={() => {
                  if (!isLoggedIn()) {
                    setShowAuthModal(true);
                  } else {
                    openBooking(packageData);
                  }
                }}
                className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors">
                Book Now
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{packageData.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            {packageData.rating > 0 && (
              <div className="flex items-center"><Star className="h-4 w-4 text-amber-500 fill-current mr-1" /><span className="font-medium">{packageData.rating}★</span></div>
            )}
            {packageData.distance && (
              <div className="flex items-center"><MapPin className="h-4 w-4 mr-1" />{packageData.distance}</div>
            )}
            {packageData.hotelRating && (
              <div className="flex items-center"><Hotel className="h-4 w-4 mr-1" />{packageData.hotelRating} Hotel</div>
            )}
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-emerald-600 mr-1" />
              <span className="text-emerald-600 font-medium">Verified Package</span>
            </div>
            {packageData.agent_name && (
              <div className="flex items-center"><User className="h-4 w-4 mr-1" />by {packageData.agent_name}</div>
            )}
          </div>
        </div>

        {/* ── Gallery Carousel ── */}
        <GalleryCarousel images={safeImages} title={packageData.title} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left column */}
          <div className={readOnlyFromBooking ? 'lg:col-span-3' : 'lg:col-span-2'}>

            {readOnlyFromBooking && (
              <div className="mb-8 border border-emerald-200 bg-emerald-50 rounded-2xl p-5">
                <h2 className="text-lg font-bold text-emerald-900 mb-1">Booked Package Information</h2>
                <p className="text-sm text-emerald-800 mb-4">
                  Booking actions are disabled here. This page is for viewing trip details only.
                </p>
                {bookedTravelers.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-emerald-900">
                      Booked Travelers ({bookedTravelers.length})
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {bookedTravelers.map((traveler) => (
                        <div key={traveler.id} className="bg-white border border-emerald-100 rounded-lg px-3 py-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">{traveler.name}</p>
                          <p className="text-xs text-gray-600">
                            {traveler.age != null ? `Age ${traveler.age}` : 'Age —'}
                            {traveler.dateOfBirth ? ` · DOB ${new Date(traveler.dateOfBirth).toLocaleDateString('en-GB')}` : ''}
                            {traveler.passportNumber ? ` · ${traveler.passportNumber}` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-emerald-800">
                    Traveler details will appear here after passport and onboarding data sync.
                  </p>
                )}
              </div>
            )}

            {/* Availability */}
            {(packageData.available_from || packageData.available_to) && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8 flex flex-wrap gap-4">
                {packageData.available_from && (
                  <div className="flex items-center gap-2 text-sm text-blue-800">
                    <Calendar className="h-4 w-4" />
                    From <strong className="ml-1">{new Date(packageData.available_from).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                  </div>
                )}
                {packageData.available_to && (
                  <div className="flex items-center gap-2 text-sm text-blue-800">
                    <Calendar className="h-4 w-4" />
                    To <strong className="ml-1">{new Date(packageData.available_to).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                  </div>
                )}
                {packageData.min_group_size && (
                  <div className="flex items-center gap-2 text-sm text-blue-800">
                    <Users className="h-4 w-4" />
                    Group: {packageData.min_group_size}–{packageData.max_group_size} people
                  </div>
                )}
              </div>
            )}

            {/* Highlights */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Package Highlights</h2>
              {(packageData.highlights ?? []).length > 0 ? (
                <ul className="space-y-2">
                  {(packageData.highlights ?? []).map((h, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{h}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[['Expert Guidance','Certified Umrah guides'],['VIP Transport','Private vehicles with drivers'],['24/7 Support','Dedicated customer service'],['All Inclusive','Hotels, meals & transfers']].map(([t,d]) => (
                    <div key={t} className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <div><h3 className="font-medium text-gray-900">{t}</h3><p className="text-sm text-gray-600">{d}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Description + inclusions/exclusions */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">About this package</h2>
              <p className="text-gray-700 mb-4">
                {packageData.description || 'Experience the spiritual journey of a lifetime with this premium Umrah package. Designed for comfort and convenience, everything you need for a blessed pilgrimage.'}
              </p>
              {(packageData.includes ?? []).length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">What's included</h3>
                  <ul className="space-y-1.5">
                    {(packageData.includes ?? []).map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />{item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(packageData.excludes ?? []).length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Not included</h3>
                  <ul className="space-y-1.5">
                    {(packageData.excludes ?? []).map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-500">
                        <X className="h-4 w-4 text-red-400 flex-shrink-0" />{item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Hotel details */}
            {(packageData.makkah_hotel_name || packageData.madinah_hotel_name) && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Hotel Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {packageData.makkah_hotel_name && (
                    <div className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2"><Hotel className="h-4 w-4 text-emerald-600" /><span className="font-semibold">Makkah Hotel</span></div>
                      <p className="font-medium text-gray-700">{packageData.makkah_hotel_name}</p>
                      {packageData.makkah_hotel_rating && <p className="text-sm text-amber-600">{'★'.repeat(Number(packageData.makkah_hotel_rating))} ({packageData.makkah_hotel_rating} stars)</p>}
                      {packageData.makkah_hotel_distance && <p className="text-sm text-gray-500 mt-1"><MapPin className="h-3 w-3 inline mr-1" />{Number(packageData.makkah_hotel_distance).toLocaleString()}m from Haram</p>}
                      {packageData.makkah_check_in_date  && <p className="text-xs text-gray-400 mt-2">Check-in: {new Date(packageData.makkah_check_in_date).toLocaleDateString('en-US',{day:'numeric',month:'short'})}</p>}
                      {packageData.makkah_check_out_date && <p className="text-xs text-gray-400">Check-out: {new Date(packageData.makkah_check_out_date).toLocaleDateString('en-US',{day:'numeric',month:'short'})}</p>}
                    </div>
                  )}
                  {packageData.madinah_hotel_name && (
                    <div className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2"><Hotel className="h-4 w-4 text-emerald-600" /><span className="font-semibold">Madinah Hotel</span></div>
                      <p className="font-medium text-gray-700">{packageData.madinah_hotel_name}</p>
                      {packageData.madinah_hotel_rating && <p className="text-sm text-amber-600">{'★'.repeat(Number(packageData.madinah_hotel_rating))} ({packageData.madinah_hotel_rating} stars)</p>}
                      {packageData.madinah_hotel_distance && <p className="text-sm text-gray-500 mt-1"><MapPin className="h-3 w-3 inline mr-1" />{Number(packageData.madinah_hotel_distance).toLocaleString()}m from Masjid Nabawi</p>}
                      {packageData.madinah_check_in_date  && <p className="text-xs text-gray-400 mt-2">Check-in: {new Date(packageData.madinah_check_in_date).toLocaleDateString('en-US',{day:'numeric',month:'short'})}</p>}
                      {packageData.madinah_check_out_date && <p className="text-xs text-gray-400">Check-out: {new Date(packageData.madinah_check_out_date).toLocaleDateString('en-US',{day:'numeric',month:'short'})}</p>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Amenities */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Amenities</h2>
                <button onClick={() => setShowAllAmenities(!showAllAmenities)} className="text-emerald-600 text-sm font-medium">
                  {showAllAmenities ? 'Show less' : 'Show all'}
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(showAllAmenities ? amenities : amenities.slice(0, 6)).map((a, i) => (
                  <div key={i} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-emerald-600">{a.icon}</div>
                    <span className="text-sm font-medium text-gray-700">{a.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Itinerary */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Daily Itinerary</h2>
              <div className="space-y-6">
                {itinerary.slice(0, packageData.duration || 7).map((day) => (
                  <div key={day.day} className="border-l-4 border-emerald-500 pl-6 py-2">
                    <div className="flex items-center mb-2">
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold mr-3">Day {day.day}</span>
                      <h3 className="text-lg font-semibold text-gray-900">{day.title}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {day.activities.map((act, idx) => (
                        <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">{act}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Guest Reviews</h2>
                  <div className="flex items-center mt-1">
                    <Star className="h-5 w-5 text-amber-500 fill-current" />
                    <span className="ml-1 text-lg font-bold">{packageData.rating > 0 ? `${packageData.rating}★` : 'New'}</span>
                    <span className="mx-2">·</span>
                    <span className="text-gray-600">{reviews.length} reviews</span>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-200 pb-6">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <span className="font-semibold text-emerald-700">{review.avatar}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <h4 className="font-semibold text-gray-900">{review.name}</h4>
                          {review.verified && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Star className="h-3 w-3 text-amber-500 fill-current mr-1" />{review.rating} · {review.date}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-3">{review.comment}</p>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Stayed {review.stay}</span>
                      <button className="hover:text-gray-700">Helpful ({review.helpful})</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column — booking card */}
          {!readOnlyFromBooking && (
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-6">
                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold text-gray-900">${formatPrice(packageData.price)}</span>
                      <span className="text-gray-500 ml-2">per person</span>
                    </div>
                    {packageData.originalPrice > packageData.price && (
                      <div className="text-right">
                        <span className="text-gray-500 line-through text-sm block">${formatPrice(packageData.originalPrice)}</span>
                        {packageData.discount > 0 && (
                          <span className="px-3 py-1 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold rounded-full">Save {packageData.discount}%</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <Calendar className="h-4 w-4 mr-2 text-emerald-600" />
                    <span className="font-medium">{packageData.duration} days</span>
                    <span className="mx-2">•</span>
                    <span>All inclusive</span>
                  </div>
                </div>

                {/* Guests */}
                <div className="space-y-4 mb-6">
                  {[
                    { key: 'adults',   label: 'Adults',   sub: 'Age 12+',   min: 1, price: packageData.price },
                    { key: 'children', label: 'Children', sub: 'Ages 2–11', min: 0, price: packageData.price * 0.5 },
                  ].map(({ key, label, sub, min, price }) => (
                    <div key={key} className="bg-gray-50 p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900 flex items-center gap-2"><User className="h-4 w-4 text-emerald-600" />{label}</div>
                        <div className="text-sm text-gray-500">{sub} · ${formatPrice(price)}/person</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setGuests(prev => ({ ...prev, [key]: Math.max(min, prev[key] - 1) }))}
                          className="w-9 h-9 flex items-center justify-center border border-gray-300 bg-white rounded-full hover:border-emerald-500 transition-all">
                          <Minus className="h-4 w-4 text-gray-600" />
                        </button>
                        <span className="font-bold text-xl text-gray-900 w-6 text-center">{guests[key]}</span>
                        <button onClick={() => setGuests(prev => ({ ...prev, [key]: prev[key] + 1 }))}
                          className="w-9 h-9 flex items-center justify-center border border-gray-300 bg-white rounded-full hover:border-emerald-500 transition-all">
                          <Plus className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="border-t border-gray-200 pt-5 mb-6 space-y-2">
                  {guests.adults > 0 && <div className="flex justify-between text-sm text-gray-700"><span>Adults × {guests.adults}</span><span>${formatPrice(packageData.price * guests.adults)}</span></div>}
                  {guests.children > 0 && <div className="flex justify-between text-sm text-gray-700"><span>Children × {guests.children}</span><span>${formatPrice(packageData.price * 0.5 * guests.children)}</span></div>}
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 space-y-1">
                    {['All taxes & fees included','No hidden charges','Verified package'].map(t => (
                      <div key={t} className="flex items-center text-xs text-emerald-700 gap-2"><CheckCircle className="h-3 w-3 flex-shrink-0" />{t}</div>
                    ))}
                  </div>
                  <div className="border-t border-gray-300 pt-4 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-lg text-gray-900">Total</div>
                      <div className="text-xs text-gray-500">{guests.adults + guests.children} traveler{guests.adults + guests.children !== 1 ? 's' : ''}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-2xl text-gray-900">${formatPrice(calculateTotal())}</div>
                      <div className="text-xs text-gray-500">Final price</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!isLoggedIn()) {
                      setShowAuthModal(true);
                    } else {
                      openBooking(packageData);
                    }
                  }}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl hover:shadow-xl hover:scale-[1.02] transform transition-all duration-300">
                  Book Now · ${formatPrice(calculateTotal())}
                </button>

                <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-2 gap-4 text-center">
                  <div className="space-y-1"><Shield className="h-5 w-5 text-emerald-600 mx-auto" /><div className="text-xs font-medium text-gray-900">All Inclusive</div><div className="text-xs text-gray-500">No hidden charges</div></div>
                  <div className="space-y-1"><CheckCircle className="h-5 w-5 text-emerald-600 mx-auto" /><div className="text-xs font-medium text-gray-900">Best Price</div><div className="text-xs text-gray-500">Guaranteed</div></div>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Similar packages */}
        {similarPkgs.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Similar packages you might like</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {similarPkgs.map((pkg) => (
                <div key={pkg.id} className="border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative h-48">
                    <img src={pkg.image} alt={pkg.title} className="w-full h-full object-cover" />
                    {pkg.discount > 0 && (
                      <div className="absolute top-3 right-3 px-2 py-1 bg-emerald-600 text-white text-xs font-semibold rounded">-{pkg.discount}%</div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">{pkg.duration} days</span>
                      {pkg.rating > 0 && <div className="flex items-center"><Star className="h-3 w-3 text-amber-500 fill-current mr-1" /><span className="text-sm font-medium">{pkg.rating}★</span></div>}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{pkg.title}</h3>
                    <div className="flex items-baseline">
                      <span className="text-xl font-bold text-gray-900">${formatPrice(pkg.price)}</span>
                      <span className="text-gray-500 text-sm ml-2">per person</span>
                    </div>
                    <button onClick={() => navigate(`/package/${pkg.id}`)} className="w-full mt-4 py-2 border border-emerald-600 text-emerald-600 font-medium rounded-lg hover:bg-emerald-50 transition-colors">
                      View details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      {/* ── Payment Modal ── */}
      {showBookingModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
             style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
               style={{ maxHeight: '95vh', overflowY: 'auto' }}>

            {/* ── Header ── */}
            <div className="sticky top-0 bg-white z-10 px-6 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {payStep !== 'select' && payStep !== 'done' && payStep !== 'processing' && (
                    <button onClick={() => setPayStep('select')}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
                      <ChevronLeft className="h-4 w-4 text-gray-600" />
                    </button>
                  )}
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg leading-tight">
                      {payStep === 'select'      && 'Choose payment'}
                      {payStep === 'card'        && 'Card details'}
                      {payStep === 'mpesa'       && 'M-Pesa payment'}
                      {payStep === 'mpesa-pin'   && 'Enter M-Pesa PIN'}
                      {payStep === 'bank'        && 'Bank transfer'}
                      {payStep === 'processing'  && 'Processing…'}
                      {payStep === 'done'        && 'Payment confirmed!'}
                    </h2>
                    {payStep !== 'done' && payStep !== 'processing' && (
                      <p className="text-xs text-gray-500 mt-0.5">Total: <span className="font-semibold text-emerald-600">${formatPrice(calculateTotal())}</span></p>
                    )}
                  </div>
                </div>
                <button onClick={closeModal}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition">
                  <X className="h-4 w-4 text-gray-600" />
                </button>
              </div>

              {/* Security badge */}
              {payStep !== 'done' && payStep !== 'processing' && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                  <Lock className="h-3 w-3 text-emerald-600" />
                  <span>256-bit SSL encrypted · PCI DSS compliant</span>
                </div>
              )}
            </div>

            <div className="px-6 py-5">

              {/* ── Order summary pill ── */}
              {payStep !== 'done' && payStep !== 'processing' && (
                <div className="mb-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={safeImages[0]} alt={packageData?.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm truncate">{packageData?.title}</div>
                    <div className="text-xs text-gray-500">{guests.adults} adult{guests.adults !== 1 ? 's' : ''}{guests.children > 0 ? ` · ${guests.children} child${guests.children !== 1 ? 'ren' : ''}` : ''}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-gray-900">${formatPrice(calculateTotal())}</div>
                    <div className="text-xs text-gray-500">incl. tax</div>
                  </div>
                </div>
              )}

              {/* ══ STEP: SELECT METHOD ══ */}
              {payStep === 'select' && (
                <div className="space-y-3">
                  {/* Card */}
                  <button onClick={() => setPayStep('card')}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition-all duration-200 group text-left">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-200 group-hover:scale-105 transition-transform">
                      <CreditCard className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">Credit / Debit Card</div>
                      <div className="text-xs text-gray-500 mt-0.5">Visa, Mastercard, Amex — instant</div>
                    </div>
                    <div className="flex gap-1">
                      {['#1A1F71','#EB001B','#F79E1B'].map((c,i) => (
                        <div key={i} className="w-7 h-5 rounded" style={{ background: i === 2 ? 'linear-gradient(135deg,#EB001B,#F79E1B)' : c, opacity: 0.85 }} />
                      ))}
                    </div>
                  </button>

                  {/* M-Pesa */}
                  <button onClick={() => setPayStep('mpesa')}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50/40 transition-all duration-200 group text-left">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-200 group-hover:scale-105 transition-transform">
                      <span className="text-white font-black text-xs leading-none text-center">M<br/>PESA</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">M-Pesa</div>
                      <div className="text-xs text-gray-500 mt-0.5">STK push to your phone — instant</div>
                    </div>
                    <div className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">Popular</div>
                  </button>

                  {/* Bank */}
                  <button onClick={() => setPayStep('bank')}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-amber-400 hover:bg-amber-50/40 transition-all duration-200 group text-left">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-200 group-hover:scale-105 transition-transform">
                      <Globe className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">Bank Transfer</div>
                      <div className="text-xs text-gray-500 mt-0.5">EFT / wire — 1–2 business days</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              )}

              {/* ══ STEP: CARD ══ */}
              {payStep === 'card' && (
                <div className="space-y-4">
                  {/* Card preview */}
                  <div className="relative h-44 rounded-2xl overflow-hidden select-none"
                       style={{ background: 'linear-gradient(135deg,#1a1f71 0%,#2563eb 60%,#0ea5e9 100%)' }}>
                    <div className="absolute inset-0 opacity-10"
                         style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                    <div className="absolute top-5 left-5 right-5 flex justify-between items-start">
                      <div className="w-8 h-6 rounded bg-yellow-300/90" style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)' }} />
                      <div className="text-white font-black text-lg tracking-wider opacity-90">VISA</div>
                    </div>
                    <div className="absolute bottom-5 left-5 right-5">
                      <div className="text-white/60 text-xs mb-1 font-mono tracking-widest">
                        {cardInfo.number || '•••• •••• •••• ••••'}
                      </div>
                      <div className="flex justify-between items-end mt-2">
                        <div>
                          <div className="text-white/50 text-[10px] uppercase tracking-wider">Card holder</div>
                          <div className="text-white font-semibold text-sm">{cardInfo.name || 'YOUR NAME'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-white/50 text-[10px] uppercase tracking-wider">Expires</div>
                          <div className="text-white font-semibold text-sm">{cardInfo.expiry || 'MM/YY'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fields */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Card number</label>
                    <input value={cardInfo.number} onChange={e => setCardInfo(p => ({ ...p, number: fmtCard(e.target.value) }))}
                      placeholder="1234 5678 9012 3456" inputMode="numeric"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-0 outline-none font-mono text-gray-900 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Cardholder name</label>
                    <input value={cardInfo.name} onChange={e => setCardInfo(p => ({ ...p, name: e.target.value.toUpperCase() }))}
                      placeholder="AS ON CARD"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-0 outline-none uppercase font-semibold text-gray-900 transition-colors" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Expiry</label>
                      <input value={cardInfo.expiry} onChange={e => setCardInfo(p => ({ ...p, expiry: fmtExpiry(e.target.value) }))}
                        placeholder="MM/YY" inputMode="numeric"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-0 outline-none font-mono text-gray-900 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">CVC</label>
                      <input value={cardInfo.cvc} onChange={e => setCardInfo(p => ({ ...p, cvc: e.target.value.replace(/\D/g,'').slice(0,4) }))}
                        placeholder="•••" inputMode="numeric" type="password"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-0 outline-none font-mono text-gray-900 transition-colors" />
                    </div>
                  </div>

                  <button onClick={simulatePayment} disabled={!cardInfo.number || !cardInfo.name || !cardInfo.expiry || !cardInfo.cvc}
                    className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg,#059669,#0d9488)' }}>
                    <Lock className="h-4 w-4" />
                    Pay ${formatPrice(calculateTotal())} securely
                  </button>
                </div>
              )}

              {/* ══ STEP: MPESA PHONE ══ */}
              {payStep === 'mpesa' && (
                <div className="space-y-5">
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-3 items-start">
                    <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-black text-[10px] leading-none text-center">M<br/>PESA</span>
                    </div>
                    <div>
                      <div className="font-semibold text-green-900 text-sm">STK Push payment</div>
                      <div className="text-xs text-green-700 mt-0.5">We'll send a secure prompt to your Safaricom number. You only need to enter your M-Pesa PIN to complete payment.</div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Safaricom number</label>
                    <div className="flex gap-2">
                      <div className="flex items-center px-3 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-semibold text-sm flex-shrink-0">+254</div>
                      <input value={mpesaPhone} onChange={e => setMpesaPhone(e.target.value.replace(/\D/g,'').slice(0,9))}
                        placeholder="7XX XXX XXX" inputMode="numeric"
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-0 outline-none font-mono text-gray-900 transition-colors" />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">e.g. 0712 345 678 → enter 712345678</p>
                  </div>

                  <button onClick={() => { if (mpesaPhone.length >= 9) setPayStep('mpesa-pin'); }}
                    disabled={mpesaPhone.length < 9}
                    className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}>
                    Send STK Push
                  </button>
                </div>
              )}

              {/* ══ STEP: MPESA PIN ══ */}
              {payStep === 'mpesa-pin' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                      <span className="text-green-700 font-black text-xl">M</span>
                    </div>
                    <p className="font-semibold text-gray-900">Prompt sent to</p>
                    <p className="text-green-700 font-mono font-bold text-lg">+254 {mpesaPhone}</p>
                    <p className="text-xs text-gray-500 mt-1">Check your phone and enter your M-Pesa PIN below</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide text-center">M-Pesa PIN</label>
                    <div className="flex gap-3 justify-center">
                      {mpesaPin.map((digit, i) => (
                        <input key={i} ref={pinRefs[i]}
                          type="password" inputMode="numeric" maxLength={1}
                          value={digit}
                          onChange={e => handlePinInput(i, e.target.value)}
                          onKeyDown={e => handlePinKey(i, e)}
                          className="w-14 h-14 text-center text-2xl font-bold border-2 rounded-2xl outline-none transition-all duration-200 focus:border-green-500 focus:bg-green-50"
                          style={{ borderColor: digit ? '#16a34a' : undefined }}
                        />
                      ))}
                    </div>
                  </div>

                  <button onClick={simulatePayment} disabled={mpesaPin.some(d => !d)}
                    className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}>
                    Confirm payment
                  </button>

                  <p className="text-center text-xs text-gray-400">
                    Didn't get the prompt?{' '}
                    <button onClick={() => setPayStep('mpesa')} className="text-green-700 font-semibold underline">Resend</button>
                  </p>
                </div>
              )}

              {/* ══ STEP: BANK ══ */}
              {payStep === 'bank' && (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
                    Transfer the exact amount below and use your booking reference. Allow <strong>1–2 business days</strong> for processing.
                  </div>

                  {[
                    ['Bank name',        'Equity Bank Kenya'],
                    ['Account name',     'Umrah Market Ltd'],
                    ['Account number',   '0123456789'],
                    ['Branch',           'Nairobi, Kenyatta Ave'],
                    ['Swift / BIC',      'EQBLKENA'],
                    ['Amount',           `KES ${formatPrice(Math.round(calculateTotal() * 130))}`],
                    ['Reference',        `UMRAH-${id.slice(0,8).toUpperCase()}`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                      <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</span>
                      <span className={`font-semibold text-gray-900 text-sm ${label === 'Reference' ? 'font-mono bg-gray-100 px-2 py-0.5 rounded' : ''}`}>{value}</span>
                    </div>
                  ))}

                  <button onClick={simulatePayment}
                    className="w-full py-4 rounded-2xl font-bold text-white text-base mt-2"
                    style={{ background: 'linear-gradient(135deg,#d97706,#b45309)' }}>
                    I've made the transfer
                  </button>
                </div>
              )}

              {/* ══ STEP: PROCESSING ══ */}
              {payStep === 'processing' && (
                <div className="py-12 flex flex-col items-center gap-4">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
                    <div className="absolute inset-3 rounded-full bg-emerald-50 flex items-center justify-center">
                      <Lock className="h-5 w-5 text-emerald-600" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-gray-900 text-lg">Processing payment…</p>
                    <p className="text-sm text-gray-500 mt-1">Please don't close this window</p>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"
                           style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}

              {/* ══ STEP: DONE ══ */}
              {payStep === 'done' && (
                <div className="py-8 flex flex-col items-center gap-4 text-center">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle className="h-12 w-12 text-emerald-600" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border-2 border-emerald-200 flex items-center justify-center">
                      <span className="text-lg">✨</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">All done!</h3>
                    <p className="text-gray-500 mt-1 text-sm">Your Umrah package is booked. A confirmation has been sent to your email.</p>
                  </div>

                  <div className="w-full bg-gray-50 rounded-2xl p-4 space-y-2 text-left">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Booking ref</span>
                      <span className="font-mono font-bold text-gray-900">UMRAH-{id.slice(0,8).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Amount paid</span>
                      <span className="font-bold text-emerald-700">${formatPrice(calculateTotal())}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Method</span>
                      <span className="font-semibold text-gray-900 capitalize">{payMethod === 'mpesa' ? 'M-Pesa' : payMethod === 'card' ? 'Card' : 'Bank transfer'}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
                    <button onClick={closeModal}
                      className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition">
                      Close
                    </button>
                    <button onClick={handleBack}
                      className="flex-1 py-3 font-bold text-white rounded-xl transition"
                      style={{ background: 'linear-gradient(135deg,#059669,#0d9488)' }}>
                      Explore more
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ── Auth gate — shown when guest clicks "Book Now" ── */}
      {/* ── BookingModal — used when standalone (no onBook prop from parent) ── */}
      {bookingPkg && (
        <BookingFlow
          pkg={bookingPkg}
          user={currentUser || userStore.get()}
          onClose={() => setBookingPkg(null)}
          // Defense-in-depth backstop: BookingFlow itself checks for a
          // valid user and calls this instead of proceeding if the session
          // turned out to be invalid/expired by the time it mounted. Same
          // recovery path as the normal guest “Book Now” click — open the
          // auth modal, and onAuthSuccess below will call openBooking()
          // again once login actually succeeds.
          onRequireAuth={() => setShowAuthModal(true)}
          onSuccess={() => {
            // Signal the dashboard to open on the My Bookings tab.
            // BookingFlow will close itself after the face-photo step — don't
            // call setBookingPkg(null) here or we'd unmount it too early.
            sessionStorage.setItem('booking_just_confirmed', '1');
            navigate('/client/dashboard');
          }}
        />
      )}

      {showAuthModal && (
        <div className="fixed inset-0 z-[100]">
          <AuthModal
            onClose={() => {
              setShowAuthModal(false);
              pendingFavouriteRef.current = false;
            }}
            onAuthSuccess={async (user) => {
              setShowAuthModal(false);

              // Propagate the newly-authenticated user up to App.jsx's
              // top-level currentUser state — localStorage (tokenStore /
              // userStore) is already correct at this point (AuthModal sets
              // those itself), but App.jsx's React state doesn't know yet.
              // Without this, navigating to /client/dashboard right after
              // booking hands ClientDashboard a stale/null `user` prop and
              // its session guard immediately kicks the client back to '/'.
              onAuthSuccess?.(user);

              // Resume a favourite action that triggered the login prompt
              if (pendingFavouriteRef.current) {
                pendingFavouriteRef.current = false;
                try {
                  await toggleFavorite?.(packageData);
                } catch (err) {
                  console.error('[toggleFavorite]', err);
                }
                return;
              }

              if (user?.role === 'agent') {
                navigate('/agent/dashboard?welcome=true');
              } else {
                openBooking(packageData);
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

export default PackageDetailPage;