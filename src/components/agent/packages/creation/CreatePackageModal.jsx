import React, { useState, useRef, useEffect } from "react";
import {
  X, Upload, Trash2, Loader2, CheckCircle2, MapPin, Building2, Check, TrendingUp,
  Sparkles, RefreshCw, ChevronDown, ChevronUp, Plus, CalendarClock,
} from "lucide-react";
import { createPackage, saveItinerary } from "../services/packagesApi";
import {
  Field, sanitizeText, sanitizeNumber, sanitizeDate,
  InputEl, TextareaEl, Stars, HotelBlock,
  RadioPillGroup, PresetChips,
} from "./Packageformcomponents";
import toast from "./Toast";

const STEPS = ["Basic Info", "Hotels", "Pricing", "Itinerary", "Highlights & Photos"];

// Server (itinerary.controller.js) caps at 60 days and sanitises to the same
// limits — these mirror that so the agent sees accurate feedback client-side
// rather than a silent truncation after save.
const ITINERARY_MAX_DAYS       = 60;
const ITINERARY_TITLE_MAXLEN   = 120;
const ITINERARY_ACT_MAXLEN     = 200;
const ITINERARY_MAX_ACTIVITIES = 12;

const HIGHLIGHT_OPTIONS = [
  "Guided Ziyarat (historical site visits)",
  "Daily meals included",
  "24/7 support",
  "Haramain high-speed train",
  "Private transfers",
  "Shared transfers",
  "Return flights",
  "Visa processing",
  "Expert Umrah guide",
  "5L Zamzam water",
  "Umrah kit included",
  "Medical insurance",
  "Daily breakfast",
  "Buffet meals",
  "Premium hotel (near Haram)",
  "Luxury accommodation",
  "Spiritual guidance sessions",
  "Tawaf & Sa'i assistance",
];

const INCLUSION_OPTIONS = [
  "Return flights",
  "Saudi visa processing",
  "Makkah hotel",
  "Madinah hotel",
  "Airport transfers",
  "Private transfers",
  "Shared transfers",
  "Daily breakfast",
  "Full board (all meals)",
  "Half board",
  "Zamzam water (5L)",
  "Umrah kit",
  "Medical insurance",
  "Travel insurance",
  "Guided Ziyarat tours",
  "Haramain train tickets",
  "Local transport",
  "Group guide",
  "24/7 customer support",
  "Laundry service",
  "English-speaking guide",
  "Hajj permit assistance",
  "Meningitis vaccination guidance",
  "Meet & greet service",
];

const EXCLUSION_OPTIONS = [
  "International flights",
  "Saudi visa fees",
  "Personal expenses",
  "Optional tours",
  "Tips & gratuities",
  "Excess baggage fees",
  "Travel insurance",
  "Meals not mentioned",
  "Entrance fees",
  "Personal shopping",
  "International calls",
  "Laundry",
  "Quarantine costs",
  "Currency exchange",
  "Personal medications",
];

const EMPTY = {
  name: "", type: "umrah", location: "makkah", description: "",
  price: "", original_price: "", discount: "", duration: "",
  available_from: "", available_to: "",
  max_group_size: "50", min_group_size: "1",
  makkah_hotel_name: "", makkah_hotel_rating: "", makkah_hotel_distance: "",
  makkah_hotel_address: "", makkah_check_in_date: "", makkah_check_out_date: "",
  madinah_hotel_name: "", madinah_hotel_rating: "", madinah_hotel_distance: "",
  madinah_hotel_address: "", madinah_check_in_date: "", madinah_check_out_date: "",
  highlights: [], inclusions: [], exclusions: [],
};

// ── Quick-start templates ───────────────────────────────────────────────────
// One tap fills the most common combinations so the agent only has to type
// the package name and price. Purely a UX shortcut — every value is still
// editable afterwards and still passes through the same sanitisation.
const PACKAGE_TEMPLATES = [
  {
    id: "umrah_economy",
    label: "Umrah · Economy 7N",
    icon: "🕋",
    data: {
      type: "umrah", location: "makkah", duration: "7",
      min_group_size: "15", max_group_size: "40",
      highlights: ["Shared transfers", "Expert Umrah guide", "Daily breakfast"],
      inclusions: ["Return flights", "Saudi visa processing", "Makkah hotel", "Madinah hotel", "Shared transfers", "Daily breakfast"],
      exclusions: ["Personal expenses", "Tips & gratuities", "Optional tours"],
    },
  },
  {
    id: "umrah_premium",
    label: "Umrah · Premium 14N",
    icon: "🌙",
    data: {
      type: "umrah", location: "makkah", duration: "14",
      min_group_size: "10", max_group_size: "25",
      highlights: ["Private transfers", "Premium hotel (near Haram)", "Haramain high-speed train", "5L Zamzam water"],
      inclusions: ["Return flights", "Saudi visa processing", "Makkah hotel", "Madinah hotel", "Private transfers", "Full board (all meals)", "Guided Ziyarat tours", "Umrah kit"],
      exclusions: ["Personal expenses", "Optional tours", "Excess baggage fees"],
    },
  },
  {
    id: "hajj_gold",
    label: "Hajj · Gold 21N",
    icon: "☪️",
    data: {
      type: "hajj", location: "makkah", duration: "21",
      min_group_size: "20", max_group_size: "60",
      highlights: ["Luxury accommodation", "24/7 support", "Spiritual guidance sessions", "Medical insurance"],
      inclusions: ["Return flights", "Saudi visa processing", "Hajj permit assistance", "Makkah hotel", "Madinah hotel", "Full board (all meals)", "Group guide", "24/7 customer support", "Medical insurance"],
      exclusions: ["Personal expenses", "Personal shopping", "International calls"],
    },
  },
  { id: "blank", label: "Start blank", icon: "✍️", data: null },
];

// ── Default itinerary generator ─────────────────────────────────────────────
// Produces a sensible day-by-day skeleton from the trip length so the agent
// never has to build one from scratch — everything stays fully editable.
const ITINERARY_MIDDLE_TEMPLATES = [
  { title: "Ziyarat & Historical Sites", activities: ["Guided tour of historical Islamic sites", "Free time for personal Ibadah"] },
  { title: "Free Day for Worship", activities: ["Perform Umrah rites at your own pace", "Rest and reflection near the Haram"] },
  { title: "Madinah Ziyarat", activities: ["Visit Quba Mosque", "Visit Uhud Mountain & battlefield", "Visit Qiblatain Mosque"] },
  { title: "Shopping & Leisure", activities: ["Free time near the Haram for shopping", "Optional group excursion"] },
];

function buildDefaultItinerary(duration, location) {
  const days = Math.min(ITINERARY_MAX_DAYS, Math.max(1, parseInt(duration, 10) || 7));
  const arrivalCity = location === "madinah" ? "Madinah" : "Jeddah, then transfer to Makkah";
  const out = [];
  for (let i = 1; i <= days; i++) {
    if (i === 1) {
      out.push({
        day: 1,
        title: "Arrival & Check-in",
        activities: [
          `Arrival at ${arrivalCity} airport`,
          "Transfer to hotel & check-in",
          "Rest and group orientation briefing",
        ],
      });
    } else if (i === days && days > 1) {
      out.push({
        day: i,
        title: "Departure",
        activities: ["Check-out from hotel", "Transfer to airport", "Departure flight home"],
      });
    } else {
      const tmpl = ITINERARY_MIDDLE_TEMPLATES[(i - 2) % ITINERARY_MIDDLE_TEMPLATES.length];
      out.push({ day: i, title: tmpl.title, activities: [...tmpl.activities] });
    }
  }
  return out;
}

function sanitizeFormPayload(form) {
  return {
    ...form,
    name:                  sanitizeText(form.name, 120),
    type:                  ["umrah", "hajj"].includes(form.type) ? form.type : "umrah",
    location:              ["makkah", "madinah", "jeddah"].includes(form.location)
                             ? form.location : "makkah",
    description:           sanitizeText(form.description, 1200),
    price:                 sanitizeNumber(form.price),
    original_price:        sanitizeNumber(form.original_price),
    discount:              sanitizeNumber(form.discount),
    duration:              sanitizeNumber(form.duration),
    min_group_size:        sanitizeNumber(form.min_group_size),
    max_group_size:        sanitizeNumber(form.max_group_size),
    available_from:        sanitizeDate(form.available_from),
    available_to:          sanitizeDate(form.available_to),
    makkah_hotel_name:     sanitizeText(form.makkah_hotel_name, 120),
    makkah_hotel_rating:   Number(form.makkah_hotel_rating) || "",
    makkah_hotel_distance: sanitizeText(form.makkah_hotel_distance, 30),
    makkah_hotel_address:  sanitizeText(form.makkah_hotel_address, 120),
    makkah_check_in_date:  sanitizeDate(form.makkah_check_in_date),
    makkah_check_out_date: sanitizeDate(form.makkah_check_out_date),
    madinah_hotel_name:     sanitizeText(form.madinah_hotel_name, 120),
    madinah_hotel_rating:   Number(form.madinah_hotel_rating) || "",
    madinah_hotel_distance: sanitizeText(form.madinah_hotel_distance, 30),
    madinah_hotel_address:  sanitizeText(form.madinah_hotel_address, 120),
    madinah_check_in_date:  sanitizeDate(form.madinah_check_in_date),
    madinah_check_out_date: sanitizeDate(form.madinah_check_out_date),
    highlights: form.highlights.map((t) => sanitizeText(t, 80)).filter(Boolean),
    inclusions: form.inclusions.map((t) => sanitizeText(t, 80)).filter(Boolean),
    exclusions: form.exclusions.map((t) => sanitizeText(t, 80)).filter(Boolean),
  };
}

// Mirrors itinerary.controller.js's own sanitisation (strip tags, cap
// lengths/counts) so the payload that reaches the server is already clean —
// defense in depth, since the server re-sanitises regardless.
function sanitizeItineraryPayload(days) {
  if (!Array.isArray(days)) return [];
  return days
    .slice(0, ITINERARY_MAX_DAYS)
    .map((d, i) => ({
      day: i + 1,
      title: sanitizeText(d.title, ITINERARY_TITLE_MAXLEN),
      activities: (Array.isArray(d.activities) ? d.activities : [])
        .slice(0, ITINERARY_MAX_ACTIVITIES)
        .map((a) => sanitizeText(a, ITINERARY_ACT_MAXLEN))
        .filter(Boolean),
    }))
    .filter((d) => d.title || d.activities.length > 0);
}

// ── helpers ──────────────────────────────────────────────────────────────────

function calcDurationNights(form) {
  const dates = [
    form.makkah_check_in_date,
    form.makkah_check_out_date,
    form.madinah_check_in_date,
    form.madinah_check_out_date,
  ].filter(Boolean).map((d) => new Date(d).getTime()).filter((n) => !isNaN(n));
  if (dates.length < 2) return "";
  const nights = Math.round((Math.max(...dates) - Math.min(...dates)) / 86400000);
  return nights > 0 ? String(nights) : "";
}

// ── sub-components ───────────────────────────────────────────────────────────

const StepBar = ({ current, total }) => (
  <div className="flex gap-1.5 px-6 pb-5">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className="h-1 flex-1 rounded-full transition-all duration-500"
        style={{
          background:
            i < current
              ? "linear-gradient(90deg,#0D3D2B,#1a6b4a)"
              : i === current
              ? "#C9A84C"
              : "#D4E8D4",
        }}
      />
    ))}
  </div>
);

const CheckboxPill = ({ label, selected, onToggle, color = "green" }) => {
  const styles = {
    gold: {
      on:  { background: "linear-gradient(135deg,#C9A84C,#a8882f)", color: "#fff", borderColor: "transparent" },
      off: { background: "#F5FAF5", color: "#6b5a1a", borderColor: "#e0cc8a" },
    },
    green: {
      on:  { background: "linear-gradient(135deg,#0D3D2B,#1a6b4a)", color: "#fff", borderColor: "transparent" },
      off: { background: "#F5FAF5", color: "#4a7c5f", borderColor: "#C8DFC8" },
    },
    red: {
      on:  { background: "linear-gradient(135deg,#dc2626,#b91c1c)", color: "#fff", borderColor: "transparent" },
      off: { background: "#fff5f5", color: "#b91c1c", borderColor: "#fca5a5" },
    },
  };
  const s = styles[color] || styles.green;
  const st = selected ? s.on : s.off;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
      style={{ ...st, borderWidth: "1px", borderStyle: "solid" }}
    >
      {selected && <Check className="h-3 w-3 flex-shrink-0" />}
      {label}
    </button>
  );
};

const OptionGrid = ({ options, selected, onChange, color }) => {
  const toggle = (opt) =>
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <CheckboxPill key={opt} label={opt} selected={selected.includes(opt)} onToggle={() => toggle(opt)} color={color} />
      ))}
    </div>
  );
};

const PriceBreakdown = ({ price }) => {
  const amt = parseFloat(price) || 0;
  if (!amt) return null;
  const fee = amt * 0.08;
  const receives = amt * 0.92;
  const fmt = (n) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div
      className="rounded-2xl p-4 space-y-2 mt-1"
      style={{ background: "#F0F8F0", border: "1px solid #C8DFC8" }}
    >
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="h-4 w-4" style={{ color: "#C9A84C" }} />
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#4a7c5f" }}>
          Earnings breakdown (per booking)
        </span>
      </div>
      <div className="flex justify-between text-sm">
        <span style={{ color: "#4a7c5f" }}>Client pays</span>
        <span className="font-semibold" style={{ color: "#0D3D2B" }}>${fmt(amt)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span style={{ color: "#7aaa8a" }}>Platform fee (8%)</span>
        <span className="font-semibold" style={{ color: "#dc2626" }}>−${fmt(fee)}</span>
      </div>
      <div
        className="flex justify-between text-sm pt-2 mt-1"
        style={{ borderTop: "1px solid #C8DFC8" }}
      >
        <span className="font-bold" style={{ color: "#0D3D2B" }}>You receive</span>
        <span className="font-bold text-base" style={{ color: "#0D3D2B" }}>${fmt(receives)}</span>
      </div>
    </div>
  );
};

// ── Itinerary day editor (used inside Step 3) ──────────────────────────────

const ItineraryDayCard = ({ day, collapsed, onToggle, onUpdateTitle, onUpdateActivity, onAddActivity, onRemoveActivity, onRemoveDay, canRemove }) => (
  <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #C8DFC8", background: "#F8FCF8" }}>
    <div
      className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
      style={{ background: "#F0F8F0" }}
      onClick={onToggle}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ background: "linear-gradient(135deg,#0D3D2B,#1a6b4a)", color: "#fff" }}
      >
        {day.day}
      </div>
      <input
        type="text"
        value={day.title}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onUpdateTitle(sanitizeText(e.target.value, ITINERARY_TITLE_MAXLEN))}
        placeholder={`Day ${day.day} title`}
        className="flex-1 bg-transparent text-sm font-semibold focus:outline-none placeholder-gray-400 min-w-0"
        style={{ color: "#0D3D2B" }}
      />
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {canRemove && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onRemoveDay(); }} className="p-1 rounded-lg hover:bg-red-50 transition-colors">
            <Trash2 className="h-3.5 w-3.5 text-red-400" />
          </button>
        )}
        {collapsed ? <ChevronDown className="h-4 w-4" style={{ color: "#7aaa8a" }} /> : <ChevronUp className="h-4 w-4" style={{ color: "#7aaa8a" }} />}
      </div>
    </div>
    {!collapsed && (
      <div className="px-4 pb-3 pt-2 space-y-2">
        {day.activities.map((act, actIdx) => (
          <div key={actIdx} className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#C9A84C" }} />
            <input
              type="text"
              value={act}
              onChange={(e) => onUpdateActivity(actIdx, e.target.value)}
              placeholder="e.g. Transfer to hotel, Perform Tawaf…"
              className="flex-1 text-sm px-3 py-2 rounded-xl focus:outline-none transition-all"
              style={{ background: "#EEF5EE", border: "1px solid #C8DFC8", color: "#0D3D2B" }}
              onFocus={(e) => { e.target.style.borderColor = "#C9A84C"; e.target.style.boxShadow = "0 0 0 3px rgba(201,168,76,0.15)"; }}
              onBlur={(e) => { e.target.style.borderColor = "#C8DFC8"; e.target.style.boxShadow = "none"; }}
            />
            {day.activities.length > 1 && (
              <button type="button" onClick={() => onRemoveActivity(actIdx)} className="p-1 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0">
                <X className="h-3.5 w-3.5 text-red-400" />
              </button>
            )}
          </div>
        ))}
        {day.activities.length < ITINERARY_MAX_ACTIVITIES && (
          <button
            type="button"
            onClick={onAddActivity}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors mt-1"
            style={{ color: "#1a6b4a", background: "rgba(13,61,43,0.06)" }}
          >
            <Plus className="h-3.5 w-3.5" /> Add activity
          </button>
        )}
      </div>
    )}
  </div>
);

// ── main modal ───────────────────────────────────────────────────────────────

const CreatePackageModal = ({ isOpen, onClose, onSave }) => {
  const [form, setForm]     = useState(EMPTY);
  const [step, setStep]     = useState(0);
  const [images, setImages] = useState([]);
  const [previews, setPrev] = useState([]);
  const [drag, setDrag]     = useState(false);
  const [status, setStatus] = useState("idle");
  const [itinerary, setItinerary]           = useState([]);
  const [itineraryTouched, setItinTouched]  = useState(false); // becomes true once agent enters the step, so auto-regeneration only happens once
  const [collapsedDays, setCollapsedDays]   = useState({});
  const [activeTemplate, setActiveTemplate] = useState(null);
  const fileRef             = useRef(null);

  // Auto-calculate duration from hotel dates
  useEffect(() => {
    const nights = calcDurationNights(form);
    if (nights !== form.duration) {
      setForm((p) => ({ ...p, duration: nights }));
    }
  }, [
    form.makkah_check_in_date, form.makkah_check_out_date,
    form.madinah_check_in_date, form.madinah_check_out_date,
  ]); // eslint-disable-line

  // Seed a default itinerary the first time the agent reaches that step, so
  // it's never blank — but never overwrite edits they've already made.
  useEffect(() => {
    if (step === 3 && !itineraryTouched) {
      const defaults = buildDefaultItinerary(form.duration, form.location);
      setItinerary(defaults);
      setCollapsedDays(
        defaults.reduce((acc, d, i) => ({ ...acc, [i]: i !== 0 && i !== defaults.length - 1 }), {})
      );
      setItinTouched(true);
    }
  }, [step]); // eslint-disable-line

  if (!isOpen) return null;

  const set    = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const isLast = step === STEPS.length - 1;
  const busy   = status === "loading";
  const ok     = status === "success";

  // ── quick-start template ────────────────────────────────────────────────

  const applyTemplate = (tmpl) => {
    setActiveTemplate(tmpl.id);
    if (tmpl.data) setForm((p) => ({ ...p, ...tmpl.data }));
  };

  // ── itinerary helpers ────────────────────────────────────────────────────

  const regenerateItinerary = () => {
    const defaults = buildDefaultItinerary(form.duration, form.location);
    setItinerary(defaults);
    setCollapsedDays(
      defaults.reduce((acc, d, i) => ({ ...acc, [i]: i !== 0 && i !== defaults.length - 1 }), {})
    );
  };

  const updateDayTitle = (dayIdx, title) =>
    setItinerary((prev) => prev.map((d, i) => (i === dayIdx ? { ...d, title } : d)));

  const updateActivity = (dayIdx, actIdx, value) =>
    setItinerary((prev) =>
      prev.map((d, i) =>
        i !== dayIdx ? d : { ...d, activities: d.activities.map((a, j) => (j === actIdx ? sanitizeText(value, ITINERARY_ACT_MAXLEN) : a)) }
      )
    );

  const addActivity = (dayIdx) =>
    setItinerary((prev) => prev.map((d, i) => (i !== dayIdx ? d : { ...d, activities: [...d.activities, ""] })));

  const removeActivity = (dayIdx, actIdx) =>
    setItinerary((prev) =>
      prev.map((d, i) => (i !== dayIdx ? d : { ...d, activities: d.activities.filter((_, j) => j !== actIdx) }))
    );

  const addDay = () => {
    if (itinerary.length >= ITINERARY_MAX_DAYS) return;
    setItinerary((prev) => [...prev, { day: prev.length + 1, title: "", activities: [""] }]);
  };

  const removeDay = (dayIdx) =>
    setItinerary((prev) => prev.filter((_, i) => i !== dayIdx).map((d, i) => ({ ...d, day: i + 1 })));

  const toggleDayCollapse = (dayIdx) =>
    setCollapsedDays((prev) => ({ ...prev, [dayIdx]: !prev[dayIdx] }));

  // ── image helpers ─────────────────────────────────────────────────────────

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

  const addFiles = (files) => {
    const valid = Array.from(files).filter(
      (f) => ALLOWED_TYPES.includes(f.type) && f.size <= 10_485_760
    );
    const next = [...images, ...valid].slice(0, 10);
    setImages(next);
    Promise.all(
      next.map(
        (f) => new Promise((res) => {
          const r = new FileReader();
          r.onload = (e) => res(e.target.result);
          r.readAsDataURL(f);
        })
      )
    ).then(setPrev);
  };

  const removeImg = (i) => {
    const next = images.filter((_, idx) => idx !== i);
    setImages(next);
    Promise.all(
      next.map(
        (f) => new Promise((res) => {
          const r = new FileReader();
          r.onload = (e) => res(e.target.result);
          r.readAsDataURL(f);
        })
      )
    ).then(setPrev);
  };

  // ── submit ────────────────────────────────────────────────────────────────
  // Two calls against two endpoints that already exist and already sanitise
  // independently server-side (createpackages.controller.js and
  // itinerary.controller.js). No backend changes needed: create the package
  // first to get its id, then attach the itinerary to that id. If the
  // itinerary save fails after a successful package creation, the package is
  // still kept — the agent can add/edit the itinerary later from the
  // packages list, so a transient error here never loses their work.

  const submit = async () => {
    setStatus("loading");
    try {
      const cleanForm = sanitizeFormPayload(form);
      const result    = await createPackage(cleanForm, images);
      const newPkg    = result.package;

      const cleanItinerary = sanitizeItineraryPayload(itinerary);
      if (newPkg?.id && cleanItinerary.length > 0) {
        try {
          await saveItinerary(newPkg.id, cleanItinerary);
        } catch (itinErr) {
          console.error("[CreatePackageModal] itinerary save failed:", itinErr);
          toast.warning(
            "Package created, itinerary not saved",
            "You can add the itinerary from the package list."
          );
        }
      }

      setStatus("success");
      toast.success("Package created!", "Your package has been saved successfully.");
      onSave?.(newPkg);
      setTimeout(() => {
        setStatus("idle");
        setForm(EMPTY);
        setStep(0);
        setImages([]);
        setPrev([]);
        setItinerary([]);
        setItinTouched(false);
        setCollapsedDays({});
        setActiveTemplate(null);
        onClose?.();
      }, 1500);
    } catch (e) {
      const msg = sanitizeText(e.message || "Something went wrong", 200);
      toast.error("Failed to create package", msg);
      setStatus("error");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,20,12,0.65)", backdropFilter: "blur(8px)" }}
      onClick={(e) => !busy && e.target === e.currentTarget && onClose?.()}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-3xl flex flex-col max-h-[92vh]"
        style={{
          border: "1px solid #C8DFC8",
          boxShadow: "0 24px 80px rgba(13,61,43,0.18), 0 0 0 1px rgba(201,168,76,0.08)",
        }}
      >
        {/* header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-2 flex-shrink-0">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: "#C9A84C" }}>
              Step {step + 1}/{STEPS.length} — {STEPS[step]}
            </p>
            <h2 className="text-xl font-bold" style={{ color: "#0D3D2B" }}>
              Create Umrah / Hajj Package
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="p-2 rounded-full transition-colors disabled:opacity-40"
            style={{ background: "#F0F8F0", border: "1px solid #C8DFC8" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#E0F0E0")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#F0F8F0")}
          >
            <X className="h-4 w-4" style={{ color: "#0D3D2B" }} />
          </button>
        </div>

        <StepBar current={step} total={STEPS.length} />

        {/* scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 pb-3 space-y-4">

          {/* STEP 0 — Basic Info */}
          {step === 0 && (
            <>
              <Field label="Quick Start" hint="tap a template to prefill, still fully editable">
                <div className="flex flex-wrap gap-2">
                  {PACKAGE_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => applyTemplate(tmpl)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all"
                      style={
                        activeTemplate === tmpl.id
                          ? { background: "linear-gradient(135deg,#0D3D2B,#1a6b4a)", color: "#fff", borderColor: "transparent" }
                          : { background: "#F5FAF5", color: "#4a7c5f", borderColor: "#C8DFC8" }
                      }
                    >
                      <span>{tmpl.icon}</span>
                      {tmpl.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Package Name" required>
                <InputEl
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. 14-Night Hajj Gold Package"
                  sanitize="text"
                  maxLen={120}
                />
              </Field>
              <div className="grid grid-cols-1 gap-3">
                <Field label="Type" required>
                  <RadioPillGroup
                    color="green"
                    value={form.type}
                    onChange={(v) => set("type", v)}
                    options={[
                      { value: "umrah", label: "Umrah", icon: "🕋" },
                      { value: "hajj",  label: "Hajj",  icon: "☪️" },
                    ]}
                  />
                </Field>
                <Field label="Primary Location" required>
                  <RadioPillGroup
                    color="gold"
                    value={form.location}
                    onChange={(v) => set("location", v)}
                    options={[
                      { value: "makkah",  label: "Makkah" },
                      { value: "madinah", label: "Madinah" },
                      { value: "jeddah",  label: "Jeddah" },
                    ]}
                  />
                </Field>
              </div>
              <Field label="Description" hint="optional">
                <TextareaEl
                  rows={3}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Describe the spiritual highlights of this package…"
                  maxLen={1200}
                />
              </Field>
            </>
          )}

          {/* STEP 1 — Hotels (duration auto-calculated from dates here) */}
          {step === 1 && (
            <>
              <HotelBlock
                city="makkah"
                icon={<MapPin className="h-4 w-4" style={{ color: "#C9A84C" }} />}
                formData={form}
                set={set}
              />
              <HotelBlock
                city="madinah"
                icon={<Building2 className="h-4 w-4" style={{ color: "#C9A84C" }} />}
                formData={form}
                set={set}
              />
              {form.duration && (
                <div
                  className="flex items-center gap-3 rounded-2xl px-4 py-3"
                  style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.3)" }}
                >
                  <span className="text-lg">🌙</span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "#0D3D2B" }}>
                      Total trip: {form.duration} nights
                    </p>
                    <p className="text-xs" style={{ color: "#7aaa8a" }}>
                      Auto-calculated from your check-in / check-out dates
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* STEP 2 — Pricing */}
          {step === 2 && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Your Price (USD)" required>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: "#7aaa8a" }}>$</span>
                    <InputEl
                      type="number" min="0" step="0.01"
                      value={form.price}
                      onChange={(e) => set("price", e.target.value)}
                      placeholder="0.00" className="pl-7" sanitize="number"
                    />
                  </div>
                </Field>
                <Field label="Original Price">
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: "#7aaa8a" }}>$</span>
                    <InputEl
                      type="number" min="0" step="0.01"
                      value={form.original_price}
                      onChange={(e) => set("original_price", e.target.value)}
                      placeholder="0.00" className="pl-7" sanitize="number"
                    />
                  </div>
                </Field>
                <Field label="Discount %" hint="0–100">
                  <PresetChips
                    color="gold"
                    value={form.discount}
                    onChange={(v) => set("discount", v)}
                    options={[0, 5, 10, 15, 20, 25]}
                    suffix="%"
                    customPlaceholder="0"
                  />
                </Field>
              </div>

              <PriceBreakdown price={form.price} />

              {/* Duration (read-only if auto-calculated, editable fallback) */}
              <Field label="Trip Duration (nights)" hint={calcDurationNights(form) ? "auto-calculated from hotel dates" : "tap a preset or enter manually"}>
                <PresetChips
                  color="gold"
                  value={form.duration}
                  onChange={(v) => set("duration", v)}
                  options={[7, 10, 14, 21, 30]}
                  suffix="n"
                  customPlaceholder="e.g. 14"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Available From">
                  <InputEl type="date" value={form.available_from}
                    onChange={(e) => set("available_from", e.target.value)} sanitize="date" />
                </Field>
                <Field label="Available To">
                  <InputEl type="date" value={form.available_to}
                    onChange={(e) => set("available_to", e.target.value)} sanitize="date" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Min Group Size">
                  <PresetChips
                    color="green"
                    value={form.min_group_size}
                    onChange={(v) => set("min_group_size", v)}
                    options={[1, 5, 10, 15, 20]}
                    customPlaceholder="1"
                  />
                </Field>
                <Field label="Max Group Size">
                  <PresetChips
                    color="green"
                    value={form.max_group_size}
                    onChange={(v) => set("max_group_size", v)}
                    options={[20, 30, 40, 50, 100]}
                    customPlaceholder="50"
                  />
                </Field>
              </div>
            </>
          )}

          {/* STEP 3 — Itinerary (pre-filled default, fully editable) */}
          {step === 3 && (
            <>
              <div
                className="flex items-start gap-3 rounded-2xl px-4 py-3"
                style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.3)" }}
              >
                <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#C9A84C" }} />
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: "#0D3D2B" }}>
                    Pre-filled from your trip length
                  </p>
                  <p className="text-xs" style={{ color: "#7aaa8a" }}>
                    Edit any day below, or regenerate if you change the duration.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={regenerateItinerary}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                  style={{ color: "#8a6a1a", background: "rgba(201,168,76,0.15)" }}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                </button>
              </div>

              <div className="space-y-3">
                {itinerary.map((day, dayIdx) => (
                  <ItineraryDayCard
                    key={dayIdx}
                    day={day}
                    collapsed={!!collapsedDays[dayIdx]}
                    onToggle={() => toggleDayCollapse(dayIdx)}
                    onUpdateTitle={(title) => updateDayTitle(dayIdx, title)}
                    onUpdateActivity={(actIdx, value) => updateActivity(dayIdx, actIdx, value)}
                    onAddActivity={() => addActivity(dayIdx)}
                    onRemoveActivity={(actIdx) => removeActivity(dayIdx, actIdx)}
                    onRemoveDay={() => removeDay(dayIdx)}
                    canRemove={itinerary.length > 1}
                  />
                ))}
              </div>

              {itinerary.length < ITINERARY_MAX_DAYS && (
                <button
                  type="button"
                  onClick={addDay}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed text-sm font-semibold transition-all"
                  style={{ borderColor: "#C8DFC8", color: "#4a7c5f" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C9A84C"; e.currentTarget.style.color = "#C9A84C"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#C8DFC8"; e.currentTarget.style.color = "#4a7c5f"; }}
                >
                  <Plus className="h-4 w-4" /> Add Day {itinerary.length + 1}
                </button>
              )}

              <div className="flex items-center gap-2 text-xs" style={{ color: "#7aaa8a" }}>
                <CalendarClock className="h-3.5 w-3.5 flex-shrink-0" />
                Saved automatically when you create the package — clients see this on the package page.
              </div>
            </>
          )}

          {/* STEP 4 — Details & Images */}
          {step === 4 && (
            <>
              {/* Highlights */}
              <Field label="Highlights" hint="tap to select">
                <OptionGrid
                  options={HIGHLIGHT_OPTIONS}
                  selected={form.highlights}
                  onChange={(v) => set("highlights", v)}
                  color="gold"
                />
              </Field>

              {/* Inclusions */}
              <Field label="Inclusions" hint="what's included in this package">
                <OptionGrid
                  options={INCLUSION_OPTIONS}
                  selected={form.inclusions}
                  onChange={(v) => set("inclusions", v)}
                  color="green"
                />
              </Field>

              {/* Exclusions */}
              <Field label="Exclusions" hint="what's not included">
                <OptionGrid
                  options={EXCLUSION_OPTIONS}
                  selected={form.exclusions}
                  onChange={(v) => set("exclusions", v)}
                  color="red"
                />
              </Field>

              {/* Images */}
              <Field label="Package Images" hint="up to 10 · max 10 MB each">
                {previews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {previews.map((src, i) => (
                      <div
                        key={i}
                        className="relative group w-[72px] h-[72px] rounded-xl overflow-hidden"
                        style={{ border: "1px solid #C8DFC8" }}
                      >
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button" onClick={() => removeImg(i)}
                          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center gap-2 border-2 border-dashed rounded-xl py-6 cursor-pointer transition-all"
                  style={{
                    borderColor: drag ? "#C9A84C" : "#C8DFC8",
                    background:  drag ? "rgba(201,168,76,0.05)" : "#F5FAF5",
                  }}
                  onMouseEnter={(e) => { if (!drag) e.currentTarget.style.borderColor = "#1a6b4a"; }}
                  onMouseLeave={(e) => { if (!drag) e.currentTarget.style.borderColor = "#C8DFC8"; }}
                >
                  <div className="p-2.5 rounded-full" style={{ background: "rgba(201,168,76,0.1)" }}>
                    <Upload className="h-5 w-5" style={{ color: "#C9A84C" }} />
                  </div>
                  <p className="text-sm" style={{ color: "#4a7c5f" }}>
                    Drop images or{" "}
                    <span className="underline font-semibold" style={{ color: "#C9A84C" }}>browse</span>
                  </p>
                  <p className="text-xs" style={{ color: "#7aaa8a" }}>
                    PNG, JPG, WEBP · {images.length}/10 selected
                  </p>
                </label>
                <input
                  ref={fileRef} type="file" multiple
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </Field>
            </>
          )}
        </div>

        {/* footer */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderTop: "1px solid #E0EFE0" }}
        >
          <button
            type="button"
            onClick={() => (step > 0 ? setStep(step - 1) : onClose?.())}
            disabled={busy}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
            style={{ color: "#0D3D2B", background: "#F0F8F0", border: "1px solid #C8DFC8" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#E0F0E0")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#F0F8F0")}
          >
            {step === 0 ? "Cancel" : "← Back"}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all"
                  style={{
                    width:      i === step ? "16px" : "8px",
                    height:     "8px",
                    background: i === step ? "#C9A84C" : i < step ? "#0D3D2B" : "#D4E8D4",
                  }}
                />
              ))}
            </div>

            {isLast ? (
              <button
                type="button"
                onClick={submit}
                disabled={busy || ok}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                style={{
                  background: ok
                    ? "linear-gradient(135deg,#1a6b4a,#0D3D2B)"
                    : "linear-gradient(135deg,#C9A84C,#a8882f)",
                  boxShadow: "0 4px 16px rgba(201,168,76,0.3)",
                  color: ok ? "white" : "#0A2E1F",
                }}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {ok   && <CheckCircle2 className="h-4 w-4" />}
                {busy ? "Creating…" : ok ? "Created!" : "Create Package"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: "linear-gradient(135deg,#0D3D2B,#1a6b4a)",
                  color: "white",
                  boxShadow: "0 4px 14px rgba(13,61,43,0.25)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePackageModal;