import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ChevronLeft, Heart, Share2, Star, Shield, CheckCircle,
  MapPin, Calendar, Users, Hotel, Clock, DollarSign,
  Wifi, Coffee, Car, Dumbbell, Utensils, Tv, Wind,
  Droplets, Bed, Bath, Users as UsersIcon, Maximize2,
  Minus, Plus, Phone, Mail, CreditCard,
  Lock, User, Globe, Info, X, Loader2, AlertCircle,
  ChevronRight, ZoomIn, ArrowLeft, ArrowRight
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// Props:
//   packages       — normalised array from App.jsx
//   loading        — boolean
//   favorites      — string[]
//   toggleFavorite — (id) => void
// ─────────────────────────────────────────────────────────────────────────────

const PackageDetailPage = ({ packages = [], loading = false, favorites = [], toggleFavorite }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const packageData = useMemo(() => packages.find(p => p.id === id) ?? null, [packages, id]);

  const similarPkgs = useMemo(
    () => packages.filter(p => p.id !== id && (p.type === packageData?.type || p.location === packageData?.location)).slice(0, 3),
    [packages, id, packageData]
  );

  // ── Gallery state ─────────────────────────────────────────────────────────
  const [activeImage,      setActiveImage]      = useState(0);
  const [lightboxOpen,     setLightboxOpen]     = useState(false);
  const [lightboxIndex,    setLightboxIndex]    = useState(0);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingStep,      setBookingStep]      = useState(1);
  const [paymentMethod,    setPaymentMethod]    = useState('card');
  const [guests,           setGuests]           = useState({ adults: 2, children: 0 });
  const [userInfo,         setUserInfo]         = useState({
    name: '', email: '', phone: '', passport: '', nationality: '', specialRequests: ''
  });

  // ── Lightbox keyboard navigation ─────────────────────────────────────────
  const allImages = useMemo(() => packageData?.images ?? [], [packageData]);
  const totalImages = allImages.length;

  const lightboxPrev = useCallback(() => setLightboxIndex(i => (i - 1 + totalImages) % totalImages), [totalImages]);
  const lightboxNext = useCallback(() => setLightboxIndex(i => (i + 1) % totalImages), [totalImages]);

  const openLightbox = (index) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e) => {
      if (e.key === 'ArrowLeft')  lightboxPrev();
      if (e.key === 'ArrowRight') lightboxNext();
      if (e.key === 'Escape')     setLightboxOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxOpen, lightboxPrev, lightboxNext]);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = lightboxOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [lightboxOpen]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatPrice  = (p) => Number(p).toLocaleString('en-US');
  const calculateTotal = () => !packageData ? 0 : guests.adults * packageData.price + guests.children * packageData.price * 0.5;
  const handlePayment  = () => setTimeout(() => setBookingStep(3), 1500);

  // ── Static display data ───────────────────────────────────────────────────
  const amenities = [
    { icon: <Wifi className="h-5 w-5" />,      label: 'Free High-Speed WiFi' },
    { icon: <Coffee className="h-5 w-5" />,    label: 'Complimentary Breakfast' },
    { icon: <Car className="h-5 w-5" />,       label: '24/7 Airport Transfer' },
    { icon: <Dumbbell className="h-5 w-5" />,  label: 'Fitness Center' },
    { icon: <Utensils className="h-5 w-5" />,  label: 'Halal Restaurant' },
    { icon: <Tv className="h-5 w-5" />,        label: 'Smart TV with Quran Channels' },
    { icon: <Wind className="h-5 w-5" />,      label: 'Air Conditioning' },
    { icon: <Droplets className="h-5 w-5" />,  label: 'Prayer Mats & Quran' },
    { icon: <Bed className="h-5 w-5" />,       label: 'Premium Bedding' },
    { icon: <Bath className="h-5 w-5" />,      label: 'Luxury Bathroom Amenities' },
    { icon: <Shield className="h-5 w-5" />,    label: '24/7 Security & CCTV' },
    { icon: <UsersIcon className="h-5 w-5" />, label: 'Family Rooms Available' },
  ];

  const itinerary = [
    { day: 1, title: 'Arrival in Jeddah',    description: 'VIP airport reception, immigration assistance, luxury transfer to Makkah hotel',  activities: ['Airport Pickup', 'Hotel Check-in', 'Welcome Dinner'] },
    { day: 2, title: 'Umrah Performance',    description: 'Guided Umrah performance with experienced scholar, Ihram guidance',                 activities: ['Tawaf', "Sa'i", 'Hair Cutting'] },
    { day: 3, title: 'Ziyarat in Makkah',   description: 'Visit historical Islamic sites in and around Makkah',                              activities: ['Jabal al-Nour', 'Hira Cave', 'Masjid al-Jinn'] },
    { day: 4, title: 'Transfer to Madinah', description: "Comfortable travel to Madinah, visit Prophet's Mosque",                           activities: ['Travel to Madinah', 'Hotel Check-in', 'Rawdah Visit'] },
    { day: 5, title: 'Ziyarat in Madinah',  description: 'Explore significant historical sites in Madinah',                                  activities: ['Quba Mosque', 'Uhud Mountain', 'Qiblatain Mosque'] },
    { day: 6, title: 'Spiritual Day',       description: 'Personal time for prayers, reflection, and optional activities',                   activities: ['Optional Tours', 'Shopping', 'Personal Time'] },
    { day: 7, title: 'Departure',           description: 'Final prayers, farewell breakfast, airport transfer',                              activities: ['Final Prayers', 'Airport Transfer', 'Departure'] },
  ];

  const reviews = [
    { id: 1, name: 'Ahmed Khan',     avatar: 'AK', rating: 4.9, date: '2 weeks ago', comment: 'Excellent service! The hotel was just 200m from Haram. Highly recommended for first-timers.', verified: true, stay: 'December 2024', helpful: 24 },
    { id: 2, name: 'Fatima Ali',     avatar: 'FA', rating: 4.7, date: '1 month ago', comment: 'Perfect for families. The distance to Haram was exactly as promised.',                         verified: true, stay: 'November 2024', helpful: 18 },
    { id: 3, name: 'Mohammed Yusuf', avatar: 'MY', rating: 5.0, date: '3 days ago',  comment: 'Best Umrah experience ever. Everything was perfectly arranged. Will book again for Hajj.',    verified: true, stay: 'January 2025',  helpful: 32 },
  ];

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading package details…</p>
        </div>
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!packageData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border border-red-200 rounded-2xl p-10 max-w-sm w-full text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-red-700 mb-4">Package not found</p>
          <button onClick={() => navigate('/')} className="text-sm text-emerald-600 hover:underline">
            ← Back to packages
          </button>
        </div>
      </div>
    );
  }

  // ── Derived gallery data ──────────────────────────────────────────────────
  // Ensure we always have a clean array; fallback to single image
  const images = allImages.length > 0 ? allImages : [packageData.image].filter(Boolean);
  const hasExtra = images.length > 5;
  const extraCount = images.length - 5;

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">

      {/* ── Fullscreen Lightbox ─────────────────────────────────────────────── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black flex flex-col"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Top bar */}
          <div
            className="flex items-center justify-between px-6 py-4 flex-shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <span className="text-white/70 text-sm font-medium">
              {lightboxIndex + 1} / {images.length}
            </span>
            <h2 className="text-white font-semibold text-sm hidden sm:block">{packageData.title}</h2>
            <button
              onClick={() => setLightboxOpen(false)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Main image area */}
          <div
            className="flex-1 flex items-center justify-center relative min-h-0 px-16"
            onClick={e => e.stopPropagation()}
          >
            <img
              key={lightboxIndex}
              src={images[lightboxIndex]}
              alt={`Photo ${lightboxIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg select-none"
              style={{ animation: 'fadeIn 0.2s ease' }}
            />

            {/* Prev */}
            {images.length > 1 && (
              <button
                onClick={lightboxPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 transition-colors backdrop-blur-sm"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
            )}

            {/* Next */}
            {images.length > 1 && (
              <button
                onClick={lightboxNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 transition-colors backdrop-blur-sm"
              >
                <ArrowRight className="h-5 w-5 text-white" />
              </button>
            )}
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div
              className="flex-shrink-0 px-6 py-4 flex gap-2 justify-center overflow-x-auto"
              onClick={e => e.stopPropagation()}
            >
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  className={`flex-shrink-0 w-14 h-10 rounded-md overflow-hidden border-2 transition-all ${
                    lightboxIndex === i ? 'border-emerald-400 opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }`}</style>
        </div>
      )}

      {/* ── Sticky Nav ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
            <ChevronLeft className="h-5 w-5 mr-1" />
            <span className="hidden sm:inline text-sm font-medium">Back to packages</span>
          </button>
          <div className="flex items-center space-x-3">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Share2 className="h-5 w-5 text-gray-600" />
            </button>
            <button onClick={() => toggleFavorite?.(packageData.id)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Heart className={`h-5 w-5 ${favorites.includes(packageData.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
            </button>
            <button
              onClick={() => setShowBookingModal(true)}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Book Now
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="mb-5">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{packageData.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            {packageData.rating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-amber-500 fill-current" />
                <span className="font-medium">{packageData.rating}</span>
              </div>
            )}
            {packageData.distance && (
              <div className="flex items-center gap-1"><MapPin className="h-4 w-4" />{packageData.distance}</div>
            )}
            {packageData.hotelRating && (
              <div className="flex items-center gap-1"><Hotel className="h-4 w-4" />{packageData.hotelRating} Hotel</div>
            )}
            <div className="flex items-center gap-1 text-emerald-600 font-medium">
              <Shield className="h-4 w-4" />Verified Package
            </div>
            {packageData.agent_name && (
              <div className="flex items-center gap-1"><User className="h-4 w-4" />by {packageData.agent_name}</div>
            )}
          </div>
        </div>

        {/* ── Gallery ─────────────────────────────────────────────────────── */}
        <div className="mb-8">
          {/* Desktop grid: 1 large (left, 2×2) + up to 4 thumbnails (right, 2×2) */}
          <div
            className="hidden lg:grid gap-2 rounded-2xl overflow-hidden"
            style={{ gridTemplateColumns: '1fr 1fr', gridTemplateRows: '230px 230px', height: '464px' }}
          >
            {/* ── Large main image ── */}
            <div
              className="row-span-2 relative overflow-hidden cursor-zoom-in group"
              onClick={() => openLightbox(activeImage)}
            >
              <img
                src={images[activeImage]}
                alt="Main view"
                loading="eager"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
              {/* Maximize button */}
              <button
                onClick={e => { e.stopPropagation(); openLightbox(activeImage); }}
                className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white text-xs font-medium rounded-lg transition-colors"
              >
                <Maximize2 className="h-4 w-4" />
                <span>View full screen</span>
              </button>
              {/* Photo count badge */}
              <div className="absolute top-4 left-4 px-3 py-1 bg-black/40 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                {activeImage + 1} / {images.length}
              </div>
            </div>

            {/* ── 4 thumbnail slots (top-right 2×2) ── */}
            {[1, 2, 3, 4].map((thumbIdx) => {
              const img = images[thumbIdx];
              const isLastSlot = thumbIdx === 4;
              const showOverlay = isLastSlot && hasExtra;

              if (!img) {
                return <div key={thumbIdx} className="bg-gray-100" />;
              }

              return (
                <div
                  key={thumbIdx}
                  onClick={() => {
                    if (showOverlay) { openLightbox(thumbIdx); }
                    else { setActiveImage(thumbIdx); }
                  }}
                  className={`relative overflow-hidden cursor-pointer group
                    ${thumbIdx === 1 ? 'rounded-tr-none' : ''}
                    ${thumbIdx === 4 ? 'rounded-br-none' : ''}
                  `}
                >
                  <img
                    src={img}
                    alt={`Photo ${thumbIdx + 1}`}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Hover tint */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-300" />

                  {/* "Show all photos" overlay on slot 4 when extras exist */}
                  {showOverlay && (
                    <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-1">
                      <ZoomIn className="h-6 w-6 text-white" />
                      <span className="text-white font-semibold text-sm">+{extraCount} more</span>
                      <span className="text-white/70 text-xs">View all {images.length} photos</span>
                    </div>
                  )}

                  {/* Active highlight ring */}
                  {activeImage === thumbIdx && !showOverlay && (
                    <div className="absolute inset-0 ring-2 ring-inset ring-emerald-500 pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Mobile: single image with arrows ── */}
          <div className="lg:hidden relative h-64 rounded-2xl overflow-hidden">
            <img
              src={images[activeImage]}
              alt="Main view"
              loading="eager"
              className="w-full h-full object-cover"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImage(i => (i - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-black/40 rounded-full text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setActiveImage(i => (i + 1) % images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-black/40 rounded-full text-white"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              onClick={() => openLightbox(activeImage)}
              className="absolute bottom-3 right-3 p-2 bg-black/40 rounded-lg text-white"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/40 text-white text-xs rounded-full">
              {activeImage + 1} / {images.length}
            </div>
          </div>

          {/* ── Thumbnail strip: visible on both desktop (for imgs 5–10) and mobile (all) ── */}
          {images.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {images.map((img, i) => (
                // On desktop: only show thumbnails beyond index 4 (indices 5–9)
                // On mobile: show all thumbnails
                <button
                  key={i}
                  onClick={() => { setActiveImage(i); }}
                  className={`
                    flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all
                    h-14 w-20
                    ${i < 5 ? 'hidden lg:hidden' : 'flex'}
                    ${activeImage === i ? 'border-emerald-500' : 'border-transparent opacity-60 hover:opacity-90'}
                    lg:${i < 5 ? 'hidden' : 'flex'}
                  `}
                  style={{ display: i < 5 ? undefined : undefined }}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}

          {/* ── "View all photos" text link ── */}
          <button
            onClick={() => openLightbox(0)}
            className="mt-3 text-sm text-emerald-600 font-medium hover:underline flex items-center gap-1"
          >
            <ZoomIn className="h-4 w-4" />
            View all {images.length} photos
          </button>
        </div>

        {/* ── Two-column layout ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left column ─────────────────────────────────────────────────── */}
          <div className="lg:col-span-2">

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
              {packageData.highlights?.length > 0 ? (
                <ul className="space-y-2">
                  {packageData.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{h}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[['Expert Guidance','Certified Umrah guides'],['VIP Transport','Private vehicles with drivers'],['24/7 Support','Dedicated customer service'],['All Inclusive','Hotels, meals & transfers']].map(([t, d]) => (
                    <div key={t} className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <div><h3 className="font-medium text-gray-900">{t}</h3><p className="text-sm text-gray-600">{d}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">About this package</h2>
              <p className="text-gray-700 mb-4">
                {packageData.description || 'Experience the spiritual journey of a lifetime with this premium Umrah package. Designed for comfort and convenience, everything you need for a blessed pilgrimage.'}
              </p>
              {packageData.includes?.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">What's included</h3>
                  <ul className="space-y-1.5">
                    {packageData.includes.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />{item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {packageData.excludes?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Not included</h3>
                  <ul className="space-y-1.5">
                    {packageData.excludes.map((item, i) => (
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
                      {packageData.makkah_check_in_date  && <p className="text-xs text-gray-400 mt-2">Check-in: {new Date(packageData.makkah_check_in_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</p>}
                      {packageData.makkah_check_out_date && <p className="text-xs text-gray-400">Check-out: {new Date(packageData.makkah_check_out_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</p>}
                    </div>
                  )}
                  {packageData.madinah_hotel_name && (
                    <div className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2"><Hotel className="h-4 w-4 text-emerald-600" /><span className="font-semibold">Madinah Hotel</span></div>
                      <p className="font-medium text-gray-700">{packageData.madinah_hotel_name}</p>
                      {packageData.madinah_hotel_rating && <p className="text-sm text-amber-600">{'★'.repeat(Number(packageData.madinah_hotel_rating))} ({packageData.madinah_hotel_rating} stars)</p>}
                      {packageData.madinah_hotel_distance && <p className="text-sm text-gray-500 mt-1"><MapPin className="h-3 w-3 inline mr-1" />{Number(packageData.madinah_hotel_distance).toLocaleString()}m from Masjid Nabawi</p>}
                      {packageData.madinah_check_in_date  && <p className="text-xs text-gray-400 mt-2">Check-in: {new Date(packageData.madinah_check_in_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</p>}
                      {packageData.madinah_check_out_date && <p className="text-xs text-gray-400">Check-out: {new Date(packageData.madinah_check_out_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</p>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Amenities */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Amenities</h2>
                <button onClick={() => setShowAllAmenities(!showAllAmenities)} className="text-emerald-600 text-sm font-medium hover:underline">
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
                    <p className="text-gray-600 mb-3">{day.description}</p>
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
                    <span className="ml-1 text-lg font-bold">{packageData.rating > 0 ? packageData.rating : 'New'}</span>
                    <span className="mx-2 text-gray-300">·</span>
                    <span className="text-gray-600">{reviews.length} reviews</span>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-200 pb-6">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <span className="font-semibold text-emerald-700 text-sm">{review.avatar}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <h4 className="font-semibold text-gray-900">{review.name}</h4>
                          {review.verified && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                        </div>
                        <div className="flex items-center text-sm text-gray-500 gap-1">
                          <Star className="h-3 w-3 text-amber-500 fill-current" />{review.rating} · {review.date}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-3">{review.comment}</p>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Stayed {review.stay}</span>
                      <button className="hover:text-gray-700 transition-colors">Helpful ({review.helpful})</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right column — booking card ──────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-6">
                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-gray-900">${formatPrice(packageData.price)}</span>
                      <span className="text-gray-500 text-sm">per person</span>
                    </div>
                    {packageData.originalPrice > packageData.price && (
                      <div className="text-right">
                        <span className="text-gray-400 line-through text-sm block">${formatPrice(packageData.originalPrice)}</span>
                        {packageData.discount > 0 && (
                          <span className="px-2 py-0.5 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold rounded-full">
                            Save {packageData.discount}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg gap-2">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium">{packageData.duration} days</span>
                    <span className="text-gray-300">•</span>
                    <span>All inclusive</span>
                  </div>
                </div>

                {/* Guest counters */}
                <div className="space-y-3 mb-6">
                  {[
                    { key: 'adults',   label: 'Adults',   sub: 'Age 12+',   min: 1, price: packageData.price },
                    { key: 'children', label: 'Children', sub: 'Ages 2–11', min: 0, price: packageData.price * 0.5 },
                  ].map(({ key, label, sub, min, price }) => (
                    <div key={key} className="bg-gray-50 p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-emerald-600" />{label}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{sub} · ${formatPrice(price)}/person</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setGuests(prev => ({ ...prev, [key]: Math.max(min, prev[key] - 1) }))}
                          className="w-8 h-8 flex items-center justify-center border border-gray-300 bg-white rounded-full hover:border-emerald-500 transition-colors"
                        >
                          <Minus className="h-3.5 w-3.5 text-gray-600" />
                        </button>
                        <span className="font-bold text-lg text-gray-900 w-5 text-center">{guests[key]}</span>
                        <button
                          onClick={() => setGuests(prev => ({ ...prev, [key]: prev[key] + 1 }))}
                          className="w-8 h-8 flex items-center justify-center border border-gray-300 bg-white rounded-full hover:border-emerald-500 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Price breakdown */}
                <div className="border-t border-gray-200 pt-4 mb-6 space-y-2">
                  {guests.adults > 0 && (
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Adults × {guests.adults}</span>
                      <span>${formatPrice(packageData.price * guests.adults)}</span>
                    </div>
                  )}
                  {guests.children > 0 && (
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Children × {guests.children}</span>
                      <span>${formatPrice(packageData.price * 0.5 * guests.children)}</span>
                    </div>
                  )}
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 space-y-1 mt-2">
                    {['All taxes & fees included', 'No hidden charges', 'Verified package'].map(t => (
                      <div key={t} className="flex items-center text-xs text-emerald-700 gap-2">
                        <CheckCircle className="h-3 w-3 flex-shrink-0" />{t}
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-gray-900">Total</div>
                      <div className="text-xs text-gray-500">{guests.adults + guests.children} traveller{guests.adults + guests.children !== 1 ? 's' : ''}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-2xl text-gray-900">${formatPrice(calculateTotal())}</div>
                      <div className="text-xs text-gray-500">Final price</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowBookingModal(true)}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl hover:shadow-lg hover:scale-[1.02] transform transition-all duration-200"
                >
                  Book Now · ${formatPrice(calculateTotal())}
                </button>

                <div className="mt-5 pt-5 border-t border-gray-200 grid grid-cols-2 gap-4 text-center">
                  <div className="space-y-1">
                    <Shield className="h-5 w-5 text-emerald-600 mx-auto" />
                    <div className="text-xs font-medium text-gray-900">All Inclusive</div>
                    <div className="text-xs text-gray-500">No hidden charges</div>
                  </div>
                  <div className="space-y-1">
                    <CheckCircle className="h-5 w-5 text-emerald-600 mx-auto" />
                    <div className="text-xs font-medium text-gray-900">Best Price</div>
                    <div className="text-xs text-gray-500">Guaranteed</div>
                  </div>
                </div>
              </div>

              {/* Need help card */}
              <div className="mt-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6">
                <div className="flex items-start mb-4">
                  <Info className="h-5 w-5 text-emerald-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-gray-900 mb-0.5">Need assistance?</h3>
                    <p className="text-sm text-gray-600">Our Umrah experts are available 24/7</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <button className="w-full py-2.5 bg-white border border-emerald-600 text-emerald-600 font-medium rounded-lg hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2 text-sm">
                    <Phone className="h-4 w-4" />Call +966 12 345 6789
                  </button>
                  <button className="w-full py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 text-sm">
                    <Mail className="h-4 w-4" />Email us
                  </button>
                </div>
                <div className="mt-4 pt-4 border-t border-emerald-100 flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-2 text-emerald-600" />
                  Response: <span className="font-medium text-emerald-700 ml-1">Under 5 minutes</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Similar packages ─────────────────────────────────────────────── */}
        {similarPkgs.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Similar packages you might like</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {similarPkgs.map((pkg) => (
                <div key={pkg.id} className="border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative h-48">
                    <img src={pkg.image} alt={pkg.title} className="w-full h-full object-cover" loading="lazy" />
                    {pkg.discount > 0 && (
                      <div className="absolute top-3 right-3 px-2 py-1 bg-emerald-600 text-white text-xs font-semibold rounded">
                        -{pkg.discount}%
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">{pkg.duration} days</span>
                      {pkg.rating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-amber-500 fill-current" />
                          <span className="text-sm font-medium">{pkg.rating}</span>
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{pkg.title}</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-gray-900">${formatPrice(pkg.price)}</span>
                      <span className="text-gray-500 text-sm">per person</span>
                    </div>
                    <button
                      onClick={() => navigate(`/package/${pkg.id}`)}
                      className="w-full mt-4 py-2 border border-emerald-600 text-emerald-600 font-medium rounded-lg hover:bg-emerald-50 transition-colors text-sm"
                    >
                      View details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── Booking Modal ────────────────────────────────────────────────────── */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {bookingStep === 1 ? 'Complete your booking' : bookingStep === 2 ? 'Payment details' : 'Booking confirmed!'}
                </h2>
                <button
                  onClick={() => { setShowBookingModal(false); setBookingStep(1); }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Step progress */}
              <div className="flex items-center mb-8">
                {[['1', 'Details'], ['2', 'Payment'], ['3', 'Confirm']].map(([num, label], i) => (
                  <React.Fragment key={num}>
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${bookingStep >= Number(num) ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                        {num}
                      </div>
                      <span className="ml-2 text-sm font-medium text-gray-700">{label}</span>
                    </div>
                    {i < 2 && (
                      <div className="flex-1 h-1 mx-4 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${bookingStep > Number(num) ? 'bg-emerald-600 w-full' : 'w-0'}`} />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Step 1 — Details */}
              {bookingStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      ['name',        'Full Name *',        'text',  'Your full name'],
                      ['email',       'Email *',            'email', 'your@email.com'],
                      ['phone',       'Phone *',            'tel',   '+1234567890'],
                      ['passport',    'Passport Number *',  'text',  'Passport number'],
                      ['nationality', 'Nationality *',      'text',  'Your nationality'],
                    ].map(([field, label, type, placeholder]) => (
                      <div key={field}>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                        <input
                          type={type}
                          value={userInfo[field]}
                          placeholder={placeholder}
                          onChange={e => setUserInfo(prev => ({ ...prev, [field]: e.target.value }))}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Special Requests</label>
                    <textarea
                      value={userInfo.specialRequests}
                      rows={3}
                      placeholder="Any special requirements…"
                      onChange={e => setUserInfo(prev => ({ ...prev, specialRequests: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm resize-none"
                    />
                  </div>
                  <button
                    onClick={() => setBookingStep(2)}
                    className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Continue to payment
                  </button>
                </div>
              )}

              {/* Step 2 — Payment */}
              {bookingStep === 2 && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    {[
                      ['card', <CreditCard className="h-5 w-5" key="c" />, 'Credit / Debit Card', 'Pay securely with your card'],
                      ['bank', <Globe className="h-5 w-5" key="b" />,     'Bank Transfer',        'Direct bank transfer'],
                    ].map(([method, icon, label, sub]) => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`w-full p-4 border rounded-xl flex items-center justify-between transition-colors ${paymentMethod === method ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-gray-400'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-gray-600">{icon}</div>
                          <div className="text-left">
                            <div className="font-medium text-gray-900 text-sm">{label}</div>
                            <div className="text-xs text-gray-500">{sub}</div>
                          </div>
                        </div>
                        {paymentMethod === method && <CheckCircle className="h-5 w-5 text-emerald-600" />}
                      </button>
                    ))}
                  </div>
                  {paymentMethod === 'card' && (
                    <div className="border border-gray-300 rounded-xl p-4 space-y-3">
                      <input type="text" placeholder="Card number" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text" placeholder="MM / YY" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                        <input type="text" placeholder="CVC" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                      </div>
                    </div>
                  )}
                  <div className="bg-gray-50 p-4 rounded-xl flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-xl text-gray-900">${formatPrice(calculateTotal())}</span>
                  </div>
                  <button
                    onClick={handlePayment}
                    className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Lock className="h-4 w-4" />Pay securely
                  </button>
                </div>
              )}

              {/* Step 3 — Confirmed */}
              {bookingStep === 3 && (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="h-10 w-10 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Booking confirmed!</h3>
                  <p className="text-gray-600 mb-6">You'll receive a confirmation email with all the details.</p>
                  <div className="bg-gray-50 p-4 rounded-xl mb-6">
                    <div className="text-sm text-gray-500 mb-1">Booking reference</div>
                    <div className="font-mono font-bold text-lg text-gray-900">UMRAH-{id.slice(0, 8).toUpperCase()}</div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => { setShowBookingModal(false); setBookingStep(1); }}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => navigate('/')}
                      className="flex-1 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      Explore more packages
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackageDetailPage;