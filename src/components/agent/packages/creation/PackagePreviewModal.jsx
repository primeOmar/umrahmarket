import React, { useState, useEffect } from "react";
import {
  X, Loader2, MapPin, Star, Clock, Calendar, Check, XCircle,
  Building2, Users, ChevronLeft, ChevronRight, Edit,
} from "lucide-react";
import { getItinerary } from "../services/packagesApi";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1564769662533-4f00a87b4056?auto=format&fit=crop&w=1200&q=80";

const PRICE_TIER_LABELS = [
  { key: "adult",       label: "Adult",       sub: "12+ yrs" },
  { key: "child",       label: "Child",       sub: "7–11 yrs" },
  { key: "minor_child", label: "Young Child", sub: "2–6 yrs" },
  { key: "infant",      label: "Infant",      sub: "Under 2 yrs" },
];

// Agent-side read-only preview — no booking/payment flow, since agents can't
// book their own packages. Just what they need to sanity-check a listing:
// photos, pricing, hotel info, inclusions, itinerary. "Edit Package" hands
// off to the existing CreatePackageModal in edit mode.
const PackagePreviewModal = ({ pkg, onClose, onEdit }) => {
  const [days, setDays]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setActiveImg(0);
    getItinerary(pkg.id)
      .then((data) => { if (!cancelled) setDays(Array.isArray(data?.days) ? data.days : []); })
      .catch(() => { if (!cancelled) setDays([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [pkg.id]);

  const images = Array.isArray(pkg.image_urls) && pkg.image_urls.length ? pkg.image_urls : [FALLBACK_IMAGE];
  const highlights = Array.isArray(pkg.highlights) ? pkg.highlights : [];
  const inclusions = Array.isArray(pkg.inclusions) ? pkg.inclusions : [];
  const exclusions = Array.isArray(pkg.exclusions) ? pkg.exclusions : [];
  const isActive = (pkg.status || "").toLowerCase() === "active";
  // Any tier the agent left blank on the package falls back to the adult/base
  // price — so this section always shows four real numbers, never a blank
  // or "N/A", even for packages saved before per-tier pricing existed.
  const priceTiers = {
    adult:       pkg.price_tiers?.adult       ?? pkg.price,
    child:       pkg.price_tiers?.child       ?? pkg.price,
    minor_child: pkg.price_tiers?.minor_child ?? pkg.price,
    infant:      pkg.price_tiers?.infant      ?? pkg.price,
  };

  const nextImg = () => setActiveImg((i) => (i + 1) % images.length);
  const prevImg = () => setActiveImg((i) => (i - 1 + images.length) % images.length);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,20,12,0.65)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-3xl flex flex-col"
        style={{ maxHeight: "90vh", border: "1px solid #C8DFC8", boxShadow: "0 24px 80px rgba(13,61,43,0.18)" }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-6 pt-5 pb-4 flex-shrink-0"
          style={{ borderBottom: "1px solid #E0EFE0" }}
        >
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: "#C9A84C" }}>
              Package Preview
            </p>
            <h2 className="text-lg font-bold leading-tight truncate" style={{ color: "#0D3D2B" }}>
              {pkg.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full transition-colors flex-shrink-0"
            style={{ background: "#F0F8F0", border: "1px solid #C8DFC8" }}
          >
            <X className="h-4 w-4" style={{ color: "#0D3D2B" }} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

          {/* Gallery */}
          <div className="relative h-56 sm:h-64 rounded-2xl overflow-hidden bg-gray-100">
            <img
              src={images[activeImg]}
              alt={pkg.name}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
            />
            <div
              className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
              style={{ background: isActive ? "#1a6b4a" : "#6b7280" }}
            >
              {pkg.status || "Draft"}
            </div>
            {images.length > 1 && (
              <>
                <button
                  type="button" onClick={prevImg}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-1.5 rounded-full transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" style={{ color: "#0D3D2B" }} />
                </button>
                <button
                  type="button" onClick={nextImg}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-1.5 rounded-full transition-colors"
                >
                  <ChevronRight className="h-4 w-4" style={{ color: "#0D3D2B" }} />
                </button>
                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <button
                      type="button" key={i} onClick={() => setActiveImg(i)}
                      className={`h-1.5 rounded-full transition-all ${i === activeImg ? "w-5 bg-white" : "w-1.5 bg-white/60"}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Key facts */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm" style={{ color: "#4a7c5f" }}>
            {pkg.duration && <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{pkg.duration} days</span>}
            {pkg.location && <span className="flex items-center gap-1.5 capitalize"><MapPin className="h-3.5 w-3.5" />{pkg.location}</span>}
            {(pkg.available_from || pkg.available_to) && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />{pkg.available_from}{pkg.available_to ? ` – ${pkg.available_to}` : ""}
              </span>
            )}
            {(pkg.min_group_size || pkg.max_group_size) && (
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{pkg.min_group_size || 1}–{pkg.max_group_size || 50} pax</span>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2 rounded-2xl px-4 py-3" style={{ background: "#F0F8F0", border: "1px solid #C8DFC8" }}>
            {pkg.original_price > pkg.price && (
              <span className="text-sm line-through" style={{ color: "#a8b8ae" }}>${pkg.original_price}</span>
            )}
            <span className="text-2xl font-bold" style={{ color: "#0D3D2B" }}>${pkg.price}</span>
            <span className="text-xs" style={{ color: "#7aaa8a" }}>per person</span>
          </div>

          {/* Age-tier pricing — what clients will actually see/pay per traveler */}
          {priceTiers && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#7aaa8a" }}>Pricing by Traveler</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRICE_TIER_LABELS.map(({ key, label, sub }) => (
                  <div key={key} className="rounded-xl px-3 py-2.5" style={{ background: "#F8FCF8", border: "1px solid #C8DFC8" }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#7aaa8a" }}>{label}</p>
                    <p className="text-sm font-bold" style={{ color: "#0D3D2B" }}>${priceTiers[key]}</p>
                    <p className="text-[10px]" style={{ color: "#a8b8ae" }}>{sub}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pkg.description && (
            <p className="text-sm leading-relaxed" style={{ color: "#4a5c52" }}>{pkg.description}</p>
          )}

          {/* Hotels */}
          {(pkg.makkah_hotel_name || pkg.madinah_hotel_name) && (
            <div className="grid sm:grid-cols-2 gap-3">
              {pkg.makkah_hotel_name && (
                <div className="rounded-2xl p-4" style={{ background: "#F8FCF8", border: "1px solid #C8DFC8" }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Building2 className="h-3.5 w-3.5" style={{ color: "#1a6b4a" }} />
                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#7aaa8a" }}>Makkah Hotel</p>
                  </div>
                  <p className="font-medium text-sm" style={{ color: "#0D3D2B" }}>{pkg.makkah_hotel_name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "#7aaa8a" }}>
                    {pkg.makkah_hotel_rating && <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-400 fill-current" />{pkg.makkah_hotel_rating}★</span>}
                    {pkg.makkah_hotel_distance && <span>{pkg.makkah_hotel_distance}m from Haram</span>}
                  </div>
                  {(pkg.makkah_check_in_date || pkg.makkah_check_out_date) && (
                    <p className="text-xs mt-1" style={{ color: "#a8b8ae" }}>{pkg.makkah_check_in_date} → {pkg.makkah_check_out_date}</p>
                  )}
                </div>
              )}
              {pkg.madinah_hotel_name && (
                <div className="rounded-2xl p-4" style={{ background: "#F8FCF8", border: "1px solid #C8DFC8" }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Building2 className="h-3.5 w-3.5" style={{ color: "#1a6b4a" }} />
                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#7aaa8a" }}>Madinah Hotel</p>
                  </div>
                  <p className="font-medium text-sm" style={{ color: "#0D3D2B" }}>{pkg.madinah_hotel_name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "#7aaa8a" }}>
                    {pkg.madinah_hotel_rating && <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-400 fill-current" />{pkg.madinah_hotel_rating}★</span>}
                    {pkg.madinah_hotel_distance && <span>{pkg.madinah_hotel_distance}m from Haram</span>}
                  </div>
                  {(pkg.madinah_check_in_date || pkg.madinah_check_out_date) && (
                    <p className="text-xs mt-1" style={{ color: "#a8b8ae" }}>{pkg.madinah_check_in_date} → {pkg.madinah_check_out_date}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Highlights / inclusions / exclusions */}
          {highlights.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#7aaa8a" }}>Highlights</p>
              <div className="flex flex-wrap gap-1.5">
                {highlights.map((h, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full" style={{ background: "#FFF8E1", color: "#a8882f", border: "1px solid #FFE082" }}>{h}</span>
                ))}
              </div>
            </div>
          )}
          {(inclusions.length > 0 || exclusions.length > 0) && (
            <div className="grid sm:grid-cols-2 gap-4">
              {inclusions.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#7aaa8a" }}>Included</p>
                  <ul className="space-y-1.5">
                    {inclusions.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-sm" style={{ color: "#4a5c52" }}>
                        <Check className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: "#1a6b4a" }} />{item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {exclusions.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#7aaa8a" }}>Not Included</p>
                  <ul className="space-y-1.5">
                    {exclusions.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-sm" style={{ color: "#4a5c52" }}>
                        <XCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-red-400" />{item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Itinerary */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#0D3D2B" }} />
            </div>
          ) : days.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#7aaa8a" }}>Itinerary</p>
              <div className="space-y-3">
                {days.map((day, i) => (
                  <div key={i} className="flex gap-3">
                    <div
                      className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg,#0D3D2B,#1a6b4a)" }}
                    >
                      {day.day ?? i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      {day.title && <p className="text-sm font-medium" style={{ color: "#0D3D2B" }}>{day.title}</p>}
                      {Array.isArray(day.activities) && day.activities.length > 0 && (
                        <ul className="mt-0.5 space-y-0.5">
                          {day.activities.map((act, j) => (
                            <li key={j} className="text-xs" style={{ color: "#7aaa8a" }}>• {act}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderTop: "1px solid #E0EFE0" }}>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ color: "#0D3D2B", background: "#F0F8F0", border: "1px solid #C8DFC8" }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => { onEdit?.(pkg); onClose(); }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{ background: "linear-gradient(135deg,#0D3D2B,#1a6b4a)", color: "#fff" }}
          >
            <Edit className="h-4 w-4" />Edit Package
          </button>
        </div>
      </div>
    </div>
  );
};

export default PackagePreviewModal;