import React, { useState, useRef, useEffect } from "react";
import {
  X, Upload, Trash2, Loader2, CheckCircle2, MapPin, Building2, Check, TrendingUp,
  Sparkles, RefreshCw, ChevronDown, ChevronUp, Plus, CalendarClock, Clock, AlertCircle,
} from "lucide-react";
import { createPackage, updatePackage, getItinerary, saveItinerary } from "../services/packagesApi";
import {
  Field, sanitizeText, sanitizeNumber, sanitizeDate,
  InputEl, TextareaEl, Stars, HotelBlock,
  RadioPillGroup, PresetChips, errorRingStyle,
} from "./Packageformcomponents";
import toast from "./Toast";
import { processPackageImages } from "./imageProcessing";

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
  // Age-tier pricing — `price` above doubles as the required Adult (12+) price.
  // The other three are optional per-package overrides; a blank tier falls
  // back to the adult price on save (handled server-side too).
  child_price: "", minor_child_price: "", infant_price: "",
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
      type: "umrah", location: "makkah_madinah", duration: "7",
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
      type: "umrah", location: "makkah_madinah", duration: "14",
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
      type: "hajj", location: "makkah_madinah_jeddah", duration: "21",
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
  const arrivalCity = location === "makkah_madinah" ? "Madinah, then continue to Makkah" : "Jeddah, then transfer to Makkah";
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
    location:              ["makkah", "makkah_madinah", "makkah_madinah_jeddah"].includes(form.location)
                             ? form.location : "makkah",
    description:           sanitizeText(form.description, 1200),
    price:                 sanitizeNumber(form.price),
    original_price:        sanitizeNumber(form.original_price),
    discount:              sanitizeNumber(form.discount),
    duration:              sanitizeNumber(form.duration),
    child_price:           sanitizeNumber(form.child_price),
    minor_child_price:     sanitizeNumber(form.minor_child_price),
    infant_price:          sanitizeNumber(form.infant_price),
    // Sent to the API as a single object; packagesApi.js should JSON.stringify
    // this into the `price_tiers` form-data field the same way it already
    // does for highlights/inclusions/exclusions. Server falls back any blank
    // tier to the adult price, so nulls here are fine.
    price_tiers: {
      adult:       sanitizeNumber(form.price) ?? 0,
      child:       form.child_price === ""       ? null : sanitizeNumber(form.child_price),
      minor_child: form.minor_child_price === "" ? null : sanitizeNumber(form.minor_child_price),
      infant:      form.infant_price === ""      ? null : sanitizeNumber(form.infant_price),
    },
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

// ── draft auto-save ──────────────────────────────────────────────────────────
// Persists in-progress form state to localStorage as the agent types, so a
// dropped connection, browser crash, or accidental tab close never means
// retyping everything. Photos (File objects) can't be cheaply persisted this
// way, so only their count is remembered — the agent gets a reminder to
// re-add them after restoring. Cleared automatically once the package is
// successfully saved, or after DRAFT_MAX_AGE_MS so stale drafts don't linger.

const DRAFT_KEY_PREFIX = "umrahmarket_draft_package_";
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DRAFT_SAVE_DEBOUNCE_MS = 600;

function getDraftKey(mode, initialPackage) {
  if ((mode === "edit" || mode === "duplicate") && initialPackage?.id) {
    return `${DRAFT_KEY_PREFIX}${mode}_${initialPackage.id}`;
  }
  return `${DRAFT_KEY_PREFIX}new`;
}

function readDraft(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.form) return null;
    if (Date.now() - (parsed.savedAt || 0) > DRAFT_MAX_AGE_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeDraft(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ ...data, savedAt: Date.now() }));
    return true;
  } catch {
    // Storage full or unavailable (e.g. private browsing) — autosave is a
    // nice-to-have, so fail silently rather than interrupting the agent.
    return false;
  }
}

function clearDraft(key) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

function formatDraftAge(ts) {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

// Skip saving essentially-empty drafts (e.g. the moment the modal opens on a
// blank form) — no point cluttering localStorage or prompting a restore for
// a form nobody actually started filling in.
function draftHasContent(form, itinerary) {
  return !!(
    (form.name && form.name.trim()) ||
    (form.description && form.description.trim()) ||
    form.price ||
    form.makkah_hotel_name ||
    form.madinah_hotel_name ||
    (Array.isArray(itinerary) && itinerary.some((d) => d.title || (d.activities || []).some(Boolean)))
  );
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

// ── validation ───────────────────────────────────────────────────────────────
// What actually makes a package "complete" enough to publish. Checked before
// advancing a tab (so an agent never gets to the end only to have "Create
// Package" fail) and again in full before the final submit (in case a
// restored draft dropped them straight onto a later step). Every error here
// is keyed by the same field name used in `form`, so it can be handed
// straight to the matching <Field error={...}> / input highlight.

// Which step a given field lives on — used to light up the right dot on the
// step bar and to know which step's errors to show inline right now.
const FIELD_STEP = {
  name: 0,
  makkah_hotel_name: 1, makkah_hotel_rating: 1, makkah_check_in_date: 1, makkah_check_out_date: 1,
  madinah_hotel_name: 1, madinah_hotel_rating: 1, madinah_check_in_date: 1, madinah_check_out_date: 1,
  price: 2, duration: 2, available_to: 2, max_group_size: 2,
  child_price: 2, minor_child_price: 2, infant_price: 2,
  itinerary: 3,
  images: 4,
};

// Fields that are validated as a pair (date ranges, min/max) — editing
// either side clears both, since the previously-shown error might now be
// resolved (or might still apply, in which case the next validation pass
// will just show it again).
const RELATED_ERROR_KEYS = {
  makkah_check_in_date:  ["makkah_check_in_date", "makkah_check_out_date"],
  makkah_check_out_date: ["makkah_check_in_date", "makkah_check_out_date"],
  madinah_check_in_date:  ["madinah_check_in_date", "madinah_check_out_date"],
  madinah_check_out_date: ["madinah_check_in_date", "madinah_check_out_date"],
  available_from: ["available_from", "available_to"],
  available_to:   ["available_from", "available_to"],
  min_group_size: ["min_group_size", "max_group_size"],
  max_group_size: ["min_group_size", "max_group_size"],
};

function validateStepFields(stepIdx, form, itinerary, images, existingImageUrls) {
  const errors = {};
  // Every package includes Makkah; Madinah (and Jeddah transit packages,
  // which still route through Madinah) need a Madinah hotel too.
  const needsMadinah = form.location !== "makkah";

  if (stepIdx === 0) {
    if (!form.name.trim()) errors.name = "Package name is required";
  }

  if (stepIdx === 1) {
    if (!form.makkah_hotel_name.trim()) errors.makkah_hotel_name = "Hotel name is required";
    if (!form.makkah_hotel_rating) errors.makkah_hotel_rating = "Star rating is required";
    if (!form.makkah_check_in_date) errors.makkah_check_in_date = "Check-in date is required";
    if (!form.makkah_check_out_date) errors.makkah_check_out_date = "Check-out date is required";
    if (
      form.makkah_check_in_date && form.makkah_check_out_date &&
      new Date(form.makkah_check_out_date) <= new Date(form.makkah_check_in_date)
    ) {
      errors.makkah_check_out_date = "Must be after check-in";
    }

    if (needsMadinah) {
      if (!form.madinah_hotel_name.trim()) errors.madinah_hotel_name = "Hotel name is required";
      if (!form.madinah_hotel_rating) errors.madinah_hotel_rating = "Star rating is required";
      if (!form.madinah_check_in_date) errors.madinah_check_in_date = "Check-in date is required";
      if (!form.madinah_check_out_date) errors.madinah_check_out_date = "Check-out date is required";
      if (
        form.madinah_check_in_date && form.madinah_check_out_date &&
        new Date(form.madinah_check_out_date) <= new Date(form.madinah_check_in_date)
      ) {
        errors.madinah_check_out_date = "Must be after check-in";
      }
    }
  }

  if (stepIdx === 2) {
    if (!form.price || Number(form.price) <= 0) errors.price = "A valid price is required";
    if (!form.duration || Number(form.duration) <= 0) errors.duration = "Trip duration is required";
    // Age-tier prices are optional (blank = falls back to adult price), but
    // if the agent enters something it has to be a valid non-negative number.
    if (form.child_price !== "" && (isNaN(Number(form.child_price)) || Number(form.child_price) < 0)) {
      errors.child_price = "Enter a valid price or leave blank";
    }
    if (form.minor_child_price !== "" && (isNaN(Number(form.minor_child_price)) || Number(form.minor_child_price) < 0)) {
      errors.minor_child_price = "Enter a valid price or leave blank";
    }
    if (form.infant_price !== "" && (isNaN(Number(form.infant_price)) || Number(form.infant_price) < 0)) {
      errors.infant_price = "Enter a valid price or leave blank";
    }
    if (
      form.available_from && form.available_to &&
      new Date(form.available_to) < new Date(form.available_from)
    ) {
      errors.available_to = "Must be after 'Available From'";
    }
    if (
      form.min_group_size && form.max_group_size &&
      Number(form.max_group_size) < Number(form.min_group_size)
    ) {
      errors.max_group_size = "Must be ≥ min group size";
    }
  }

  if (stepIdx === 3) {
    if (!itinerary.length) {
      errors.itinerary = "Add at least one day to the itinerary";
    } else if (itinerary.some((d) => !String(d.title || "").trim())) {
      errors.itinerary = "Every day needs a short title";
    }
  }

  if (stepIdx === 4) {
    if (existingImageUrls.length + images.length === 0) {
      errors.images = "Add at least one photo of the package";
    }
  }

  return errors;
}

function validateAllSteps(form, itinerary, images, existingImageUrls) {
  let merged = {};
  let firstInvalidStep = -1;
  for (let i = 0; i < STEPS.length; i++) {
    const stepErrors = validateStepFields(i, form, itinerary, images, existingImageUrls);
    if (Object.keys(stepErrors).length > 0 && firstInvalidStep === -1) firstInvalidStep = i;
    merged = { ...merged, ...stepErrors };
  }
  return { errors: merged, firstInvalidStep };
}

// ── sub-components ───────────────────────────────────────────────────────────

const StepBar = ({ current, total, errorSteps }) => (
  <div className="flex gap-1.5 px-6 pb-5">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className="h-1 flex-1 rounded-full transition-all duration-500"
        style={{
          background:
            errorSteps?.has(i) && i !== current
              ? "#dc2626"
              : i < current
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
  const fee = amt * 0.07;
  const receives = amt * 0.93;
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
        <span style={{ color: "#7aaa8a" }}>Platform fee 7%)</span>
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

const ItineraryDayCard = ({ day, collapsed, onToggle, onUpdateTitle, onUpdateActivity, onAddActivity, onRemoveActivity, onRemoveDay, canRemove, titleMissing }) => (
  <div
    className="rounded-2xl overflow-hidden transition-colors"
    style={{ border: titleMissing ? "1px solid #f3a5a5" : "1px solid #C8DFC8", background: "#F8FCF8" }}
  >
    <div
      className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
      style={{ background: titleMissing ? "#FEF6F6" : "#F0F8F0" }}
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
        placeholder={`Day ${day.day} title — required`}
        className="flex-1 bg-transparent text-sm font-semibold focus:outline-none placeholder-gray-400 min-w-0"
        style={{ color: titleMissing ? "#dc2626" : "#0D3D2B" }}
      />
      {titleMissing && <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: "#dc2626" }} />}
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

// mode: "create" | "edit" | "duplicate". initialPackage: the source package
// object (from the agent's package list) when mode is "edit" or "duplicate".
const CreatePackageModal = ({ isOpen, onClose, onSave, mode = "create", initialPackage = null }) => {
  const [form, setForm]     = useState(EMPTY);
  const [step, setStep]     = useState(0);
  const [images, setImages] = useState([]);
  const [previews, setPrev] = useState([]);
  const [imageMeta, setImageMeta] = useState([]); // parallel to `images`: { isLowRes, width, height }
  const [processingImages, setProcessingImages] = useState(false);
  const [existingImageUrls, setExistingImageUrls] = useState([]); // photos already on R2 — kept unless the agent removes them
  const [drag, setDrag]     = useState(false);
  const [status, setStatus] = useState("idle");
  const [itinerary, setItinerary]           = useState([]);
  const [itineraryTouched, setItinTouched]  = useState(false); // becomes true once agent enters the step, so auto-regeneration only happens once
  const [itineraryLoading, setItinLoading]  = useState(false);
  const [collapsedDays, setCollapsedDays]   = useState({});
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [errors, setErrors] = useState({}); // field name -> message, see validateStepFields
  const fileRef             = useRef(null);

  // Draft auto-save
  const [draftKey, setDraftKey]       = useState(() => getDraftKey(mode, initialPackage));
  const [draftBanner, setDraftBanner] = useState(null); // { savedAt, imagesCount } when a restorable draft exists
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const skipNextAutosave = useRef(false); // true right after hydrating/opening, so we don't instantly re-save over a draft the agent hasn't decided on yet

  const isEdit = mode === "edit";

  // Hydrate the form when opening in edit/duplicate mode, or reset to blank
  // for create. Keyed on isOpen so every open starts from a clean slate.
  useEffect(() => {
    if (!isOpen) return;

    const key = getDraftKey(mode, initialPackage);
    setDraftKey(key);
    setLastSavedAt(null);
    // Don't let the autosave effect immediately fire on the blank/hydrated
    // state we're about to set below — wait for the agent to actually type,
    // or to make a restore/discard decision on the banner first.
    skipNextAutosave.current = true;
    const existingDraft = readDraft(key);
    setDraftBanner(existingDraft ? { savedAt: existingDraft.savedAt, imagesCount: existingDraft.imagesCount || 0 } : null);

    if (mode === "create" || !initialPackage) {
      setForm(EMPTY);
      setImages([]); setPrev([]); setImageMeta([]);
      setExistingImageUrls([]);
      setItinerary([]); setItinTouched(false); setCollapsedDays({});
      setActiveTemplate(null);
      setErrors({});
      setStep(0);
      setStatus("idle");
      return;
    }

    const pkg = initialPackage;
    setForm({
      name:                  mode === "duplicate" ? `${pkg.name || ""} (Copy)` : (pkg.name || ""),
      type:                  pkg.type || "umrah",
      location:              pkg.location || "makkah",
      description:           pkg.description || "",
      price:                 pkg.price != null ? String(pkg.price) : "",
      original_price:        pkg.original_price != null ? String(pkg.original_price) : "",
      discount:              pkg.discount != null ? String(pkg.discount) : "",
      duration:              pkg.duration != null ? String(pkg.duration) : "",
      // Always reflect what's actually saved, so an agent editing a package
      // sees the real per-tier price (even if it happens to equal the adult
      // price) rather than a blank field they can't distinguish from an
      // unset one. Only genuinely missing data (no price_tiers at all, e.g.
      // a package saved before this feature existed) leaves it blank.
      child_price:       pkg.price_tiers?.child       != null ? String(pkg.price_tiers.child)       : "",
      minor_child_price: pkg.price_tiers?.minor_child != null ? String(pkg.price_tiers.minor_child) : "",
      infant_price:      pkg.price_tiers?.infant      != null ? String(pkg.price_tiers.infant)      : "",
      available_from:        pkg.available_from || "",
      available_to:          pkg.available_to || "",
      max_group_size:        pkg.max_group_size != null ? String(pkg.max_group_size) : "50",
      min_group_size:        pkg.min_group_size != null ? String(pkg.min_group_size) : "1",
      makkah_hotel_name:     pkg.makkah_hotel_name || "",
      makkah_hotel_rating:   pkg.makkah_hotel_rating != null ? String(pkg.makkah_hotel_rating) : "",
      makkah_hotel_distance: pkg.makkah_hotel_distance || "",
      makkah_hotel_address:  pkg.makkah_hotel_address || "",
      makkah_check_in_date:  pkg.makkah_check_in_date || "",
      makkah_check_out_date: pkg.makkah_check_out_date || "",
      madinah_hotel_name:     pkg.madinah_hotel_name || "",
      madinah_hotel_rating:   pkg.madinah_hotel_rating != null ? String(pkg.madinah_hotel_rating) : "",
      madinah_hotel_distance: pkg.madinah_hotel_distance || "",
      madinah_hotel_address:  pkg.madinah_hotel_address || "",
      madinah_check_in_date:  pkg.madinah_check_in_date || "",
      madinah_check_out_date: pkg.madinah_check_out_date || "",
      highlights: Array.isArray(pkg.highlights) ? pkg.highlights : [],
      inclusions: Array.isArray(pkg.inclusions) ? pkg.inclusions : [],
      exclusions: Array.isArray(pkg.exclusions) ? pkg.exclusions : [],
    });
    setExistingImageUrls(Array.isArray(pkg.image_urls) ? pkg.image_urls : []);
    setImages([]); setPrev([]); setImageMeta([]);
    setActiveTemplate(null);
    setErrors({});
    setStep(0);
    setStatus("idle");

    // Block the auto-seed effect below from stomping on this with a blank
    // default itinerary while the real one is still loading.
    setItinTouched(true);
    setItinLoading(true);
    getItinerary(pkg.id)
      .then((data) => {
        const days = Array.isArray(data?.days) && data.days.length
          ? data.days
          : buildDefaultItinerary(pkg.duration, pkg.location);
        setItinerary(days);
        setCollapsedDays(days.reduce((acc, d, i) => ({ ...acc, [i]: i !== 0 && i !== days.length - 1 }), {}));
      })
      .catch(() => {
        const days = buildDefaultItinerary(pkg.duration, pkg.location);
        setItinerary(days);
        setCollapsedDays(days.reduce((acc, d, i) => ({ ...acc, [i]: i !== 0 && i !== days.length - 1 }), {}));
      })
      .finally(() => setItinLoading(false));
  }, [isOpen, mode, initialPackage]); // eslint-disable-line

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
  // it's never blank — but never overwrite edits they've already made, and
  // never overwrite what the edit/duplicate hydration is loading.
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

  // Debounced autosave — fires on any form/itinerary/step change while the
  // modal is open. Skipped for empty-content states and for the one render
  // right after opening (see skipNextAutosave above).
  useEffect(() => {
    if (!isOpen) return;
    if (skipNextAutosave.current) { skipNextAutosave.current = false; return; }

    const t = setTimeout(() => {
      if (!draftHasContent(form, itinerary)) return;
      const saved = writeDraft(draftKey, {
        form, itinerary, step, activeTemplate, existingImageUrls,
        imagesCount: images.length,
        mode,
      });
      if (saved) setLastSavedAt(Date.now());
    }, DRAFT_SAVE_DEBOUNCE_MS);

    return () => clearTimeout(t);
  }, [form, itinerary, step, activeTemplate, existingImageUrls, images.length, isOpen, draftKey, mode]);

  if (!isOpen) return null;

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    const keysToClear = RELATED_ERROR_KEYS[k] || [k];
    if (keysToClear.some((kk) => errors[kk])) {
      setErrors((prev) => {
        const next = { ...prev };
        keysToClear.forEach((kk) => delete next[kk]);
        return next;
      });
    }
  };
  const isLast = step === STEPS.length - 1;
  // Which step dots should read as "needs attention" right now.
  const errorSteps = new Set(Object.keys(errors).map((k) => FIELD_STEP[k]).filter((v) => v !== undefined));
  const currentStepHasErrors = Object.keys(errors).some((k) => FIELD_STEP[k] === step);
  const busy   = status === "loading";
  const ok     = status === "success";

  // ── quick-start template ────────────────────────────────────────────────

  const applyTemplate = (tmpl) => {
    setActiveTemplate(tmpl.id);
    if (tmpl.data) {
      setForm((p) => ({ ...p, ...tmpl.data }));
      // Duration/highlights/inclusions/exclusions live on later steps and
      // won't be visible from here, so confirm immediately or it looks like
      // nothing happened.
      toast.success(`${tmpl.label} applied — duration, highlights & inclusions prefilled`);
    } else {
      // "Start blank" previously only toggled the highlight and left
      // whatever a prior template had already filled in place.
      setForm((p) => ({ ...EMPTY, name: p.name }));
      toast.info("Starting blank — all fields reset except the package name");
    }
  };

  // ── draft restore/discard ────────────────────────────────────────────────

  const restoreDraft = () => {
    const draft = readDraft(draftKey);
    if (!draft) { setDraftBanner(null); return; }
    setForm((p) => ({ ...p, ...draft.form }));
    if (Array.isArray(draft.itinerary) && draft.itinerary.length) {
      setItinerary(draft.itinerary);
      setItinTouched(true);
      setCollapsedDays(
        draft.itinerary.reduce((acc, d, i) => ({ ...acc, [i]: i !== 0 && i !== draft.itinerary.length - 1 }), {})
      );
    }
    if (typeof draft.step === "number") setStep(draft.step);
    if (draft.activeTemplate) setActiveTemplate(draft.activeTemplate);
    setDraftBanner(null);
    toast.success(
      "Draft restored",
      draft.imagesCount > 0
        ? `Picking up where you left off — you'll need to re-add ${draft.imagesCount} photo${draft.imagesCount > 1 ? "s" : ""}, they aren't saved in the draft.`
        : "Picking up right where you left off."
    );
  };

  const discardDraft = () => {
    clearDraft(draftKey);
    setDraftBanner(null);
  };

  // ── itinerary helpers ────────────────────────────────────────────────────

  const clearItineraryError = () => {
    if (errors.itinerary) setErrors((prev) => { const n = { ...prev }; delete n.itinerary; return n; });
  };

  const regenerateItinerary = () => {
    const defaults = buildDefaultItinerary(form.duration, form.location);
    setItinerary(defaults);
    setCollapsedDays(
      defaults.reduce((acc, d, i) => ({ ...acc, [i]: i !== 0 && i !== defaults.length - 1 }), {})
    );
    clearItineraryError();
  };

  const updateDayTitle = (dayIdx, title) => {
    setItinerary((prev) => prev.map((d, i) => (i === dayIdx ? { ...d, title } : d)));
    clearItineraryError();
  };

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

  const removeDay = (dayIdx) => {
    setItinerary((prev) => prev.filter((_, i) => i !== dayIdx).map((d, i) => ({ ...d, day: i + 1 })));
    clearItineraryError();
  };

  const toggleDayCollapse = (dayIdx) =>
    setCollapsedDays((prev) => ({ ...prev, [dayIdx]: !prev[dayIdx] }));

  // ── image helpers ─────────────────────────────────────────────────────────

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

  // Every accepted photo is re-encoded client-side before it's added to
  // `images` (and therefore before it's ever uploaded to R2): oversized
  // photos are downscaled to a sharp-but-reasonable cap, orientation is
  // corrected, and undersized photos are flagged rather than silently
  // stretched later in the carousel/thumbnail. See imageProcessing.js.
  const addFiles = async (files) => {
    const incoming = Array.from(files).filter(
      (f) => ALLOWED_TYPES.includes(f.type) && f.size <= 10_485_760
    );
    if (incoming.length === 0) return;

    const maxNew = Math.max(0, 10 - existingImageUrls.length - images.length);
    if (maxNew === 0) {
      toast.warning("You've reached the 10 photo limit for this package.");
      return;
    }
    const toProcess = incoming.slice(0, maxNew);
    if (incoming.length > toProcess.length) {
      toast.warning(`Only ${maxNew} more photo${maxNew === 1 ? "" : "s"} can be added (10 max).`);
    }

    setProcessingImages(true);
    try {
      const { results, failedCount } = await processPackageImages(toProcess);
      if (results.length > 0) {
        setImages((prev) => [...prev, ...results.map((r) => r.file)]);
        setPrev((prev) => [...prev, ...results.map((r) => r.previewUrl)]);
        setImageMeta((prev) => [
          ...prev,
          ...results.map((r) => ({ isLowRes: r.isLowRes, width: r.width, height: r.height })),
        ]);
        if (errors.images) setErrors((prev) => { const n = { ...prev }; delete n.images; return n; });
      }
      const lowResCount = results.filter((r) => r.isLowRes).length;
      if (lowResCount > 0) {
        toast.warning(
          `${lowResCount} photo${lowResCount > 1 ? "s look" : " looks"} low-resolution — it may appear soft in the package carousel. Consider swapping in a higher-res photo.`
        );
      }
      if (failedCount > 0) {
        toast.error(`Couldn't process ${failedCount} photo${failedCount > 1 ? "s" : ""}. Try a different file.`);
      }
    } finally {
      setProcessingImages(false);
    }
  };

  const removeImg = (i) => {
    setPrev((prev) => {
      URL.revokeObjectURL(prev[i]);
      return prev.filter((_, idx) => idx !== i);
    });
    setImages((prev) => prev.filter((_, idx) => idx !== i));
    setImageMeta((prev) => prev.filter((_, idx) => idx !== i));
  };

  const removeExistingImg = (i) => {
    setExistingImageUrls((prev) => prev.filter((_, idx) => idx !== i));
  };

  // ── step navigation ──────────────────────────────────────────────────────
  // Validates only the step the agent is leaving — cheap, and means an error
  // introduced on step 1 doesn't block them from reaching step 3 to fix a
  // typo there. Full cross-step validation still runs again at submit time.
  const goNext = () => {
    const stepErrors = validateStepFields(step, form, itinerary, images, existingImageUrls);
    if (Object.keys(stepErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...stepErrors }));
      toast.error("A few required fields are missing", "Check the highlighted fields before continuing.");
      return;
    }
    // Clear only this step's errors — any errors left over from other steps
    // (e.g. spotted at submit time, then the agent jumped back) stay visible.
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => { if (FIELD_STEP[k] === step) delete next[k]; });
      return next;
    });
    setStep(step + 1);
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
    // Re-check everything (not just the current step) — a restored draft can
    // drop the agent straight onto a later step, bypassing the per-step Next
    // checks below, so this is the last line of defense before hitting the API.
    const { errors: allErrors, firstInvalidStep } = validateAllSteps(form, itinerary, images, existingImageUrls);
    if (firstInvalidStep !== -1) {
      setErrors(allErrors);
      setStep(firstInvalidStep);
      toast.error(
        "Some required fields are missing",
        `Check ${STEPS[firstInvalidStep]} — highlighted fields need your attention.`
      );
      return;
    }

    setStatus("loading");
    try {
      const cleanForm = sanitizeFormPayload(form);

      const result = isEdit
        ? await updatePackage(initialPackage.id, cleanForm, images, existingImageUrls)
        : await createPackage(cleanForm, images, existingImageUrls); // duplicate carries existingImageUrls too
      const savedPkg = result.package;

      const cleanItinerary = sanitizeItineraryPayload(itinerary);
      // On edit, always sync the itinerary (even to an empty list, so removed
      // days actually get removed). On create/duplicate, only write it if
      // there's something to write.
      if (savedPkg?.id && (isEdit || cleanItinerary.length > 0)) {
        try {
          await saveItinerary(savedPkg.id, cleanItinerary);
        } catch (itinErr) {
          
          toast.warning(
            isEdit ? "Package updated, itinerary not saved" : "Package created, itinerary not saved",
            "You can update the itinerary from the package list."
          );
        }
      }

      setStatus("success");
      clearDraft(draftKey);
      setDraftBanner(null);
      setLastSavedAt(null);
      toast.success(
        isEdit ? "Package updated!" : "Package created!",
        isEdit ? "Your changes have been saved." : "Your package has been saved successfully."
      );
      onSave?.(savedPkg);
      setTimeout(() => {
        setStatus("idle");
        setForm(EMPTY);
        setStep(0);
        setImages([]);
        setPrev([]);
        setExistingImageUrls([]);
        setItinerary([]);
        setItinTouched(false);
        setCollapsedDays({});
        setActiveTemplate(null);
        setErrors({});
        onClose?.();
      }, 1200);
    } catch (e) {
      const msg = sanitizeText(e.message || "Something went wrong", 200);
      toast.error(isEdit ? "Failed to update package" : "Failed to create package", msg);
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
              {isEdit ? "Edit Package" : mode === "duplicate" ? "Duplicate Package" : "Create Umrah / Hajj Package"}
            </h2>
            {lastSavedAt && (
              <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: "#7aaa8a" }}>
                <Clock className="h-3 w-3" /> Draft saved on this device — safe if you lose connection
              </p>
            )}
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

        <StepBar current={step} total={STEPS.length} errorSteps={errorSteps} />

        {/* scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 pb-3 space-y-4">

          {draftBanner && (
            <div
              className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
              style={{ background: "#FFF8E1", border: "1px solid #FFE082" }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <RefreshCw className="h-4 w-4 flex-shrink-0" style={{ color: "#a8882f" }} />
                <p className="text-sm min-w-0" style={{ color: "#7a5a10" }}>
                  <span className="font-semibold">Unsaved progress found</span> from {formatDraftAge(draftBanner.savedAt)} — restore it?
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={discardDraft}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={{ color: "#7a5a10", background: "rgba(122,90,16,0.08)" }}
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={restoreDraft}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
                  style={{ background: "linear-gradient(135deg,#C9A84C,#a8882f)" }}
                >
                  Restore
                </button>
              </div>
            </div>
          )}

          {currentStepHasErrors && (
            <div
              className="flex items-center gap-2.5 rounded-2xl px-4 py-3"
              style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: "#dc2626" }} />
              <p className="text-sm font-semibold" style={{ color: "#b91c1c" }}>
                A few required fields need your attention below before you can continue.
              </p>
            </div>
          )}

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

              <Field label="Package Name" required error={errors.name}>
                <InputEl
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. 14-Night Hajj Gold Package"
                  sanitize="text"
                  maxLen={120}
                  style={errors.name ? errorRingStyle : {}}
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
                <Field label="Primary Location" required hint="which cities this package covers">
                  <RadioPillGroup
                    color="gold"
                    value={form.location}
                    onChange={(v) => set("location", v)}
                    options={[
                      { value: "makkah",                 label: "Makkah Only",              icon: "🕋" },
                      { value: "makkah_madinah",          label: "Makkah & Madinah",         icon: "🕌" },
                      { value: "makkah_madinah_jeddah",   label: "Makkah, Madinah & Jeddah",  icon: "🌊" },
                    ]}
                  />
                </Field>
              </div>
              <p className="text-xs -mt-1" style={{ color: "#7aaa8a" }}>
                Clients filter by exactly which of these three a package covers — pick the option that matches this package's full itinerary, not just where it starts.
              </p>
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
                required
                errors={{
                  name: errors.makkah_hotel_name,
                  rating: errors.makkah_hotel_rating,
                  checkIn: errors.makkah_check_in_date,
                  checkOut: errors.makkah_check_out_date,
                }}
              />
              <HotelBlock
                city="madinah"
                icon={<Building2 className="h-4 w-4" style={{ color: "#C9A84C" }} />}
                formData={form}
                set={set}
                required={form.location !== "makkah"}
                errors={{
                  name: errors.madinah_hotel_name,
                  rating: errors.madinah_hotel_rating,
                  checkIn: errors.madinah_check_in_date,
                  checkOut: errors.madinah_check_out_date,
                }}
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
                <Field label="Adult Price (12+ yrs)" required error={errors.price}>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: "#7aaa8a" }}>$</span>
                    <InputEl
                      type="number" min="0" step="0.01"
                      value={form.price}
                      onChange={(e) => set("price", e.target.value)}
                      placeholder="0.00" className="pl-7" sanitize="number"
                      style={errors.price ? errorRingStyle : {}}
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
                {/* <Field label="Discount %" hint="0–100">
                  <PresetChips
                    color="gold"
                    value={form.discount}
                    onChange={(v) => set("discount", v)}
                    options={[0, 5, 10, 15, 20, 25]}
                    suffix="%"
                    customPlaceholder="0"
                  />
                </Field> */}
              </div>

              {/* Age-tier pricing — all optional, each falls back to the
                  adult price above if left blank. Wired to the booking modal
                  next so a client can select how many of each age group. */}
              <Field label="Pricing by Age Group" hint="optional · leave blank to charge the adult price for that group">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs font-medium mb-1.5" style={{ color: "#4a7c5f" }}>Child (7–11 yrs)</p>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: "#7aaa8a" }}>$</span>
                      <InputEl
                        type="number" min="0" step="0.01"
                        value={form.child_price}
                        onChange={(e) => set("child_price", e.target.value)}
                        placeholder={form.price || "0.00"} className="pl-7" sanitize="number"
                        style={errors.child_price ? errorRingStyle : {}}
                      />
                    </div>
                    {errors.child_price && <p className="text-xs mt-1 text-red-500">{errors.child_price}</p>}
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1.5" style={{ color: "#4a7c5f" }}>Minor Child (2–6 yrs)</p>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: "#7aaa8a" }}>$</span>
                      <InputEl
                        type="number" min="0" step="0.01"
                        value={form.minor_child_price}
                        onChange={(e) => set("minor_child_price", e.target.value)}
                        placeholder={form.price || "0.00"} className="pl-7" sanitize="number"
                        style={errors.minor_child_price ? errorRingStyle : {}}
                      />
                    </div>
                    {errors.minor_child_price && <p className="text-xs mt-1 text-red-500">{errors.minor_child_price}</p>}
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1.5" style={{ color: "#4a7c5f" }}>Infant (under 2 yrs)</p>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: "#7aaa8a" }}>$</span>
                      <InputEl
                        type="number" min="0" step="0.01"
                        value={form.infant_price}
                        onChange={(e) => set("infant_price", e.target.value)}
                        placeholder={form.price || "0.00"} className="pl-7" sanitize="number"
                        style={errors.infant_price ? errorRingStyle : {}}
                      />
                    </div>
                    {errors.infant_price && <p className="text-xs mt-1 text-red-500">{errors.infant_price}</p>}
                  </div>
                </div>
              </Field>

              <PriceBreakdown price={form.price} />
              

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
                <Field label="Max Group Size" error={errors.max_group_size}>
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
          {step === 3 && itineraryLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin" style={{ color: "#0D3D2B" }} />
            </div>
          )}
          {step === 3 && !itineraryLoading && (
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

              {errors.itinerary && (
                <div
                  className="flex items-center gap-2.5 rounded-2xl px-4 py-2.5"
                  style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: "#dc2626" }} />
                  <p className="text-sm font-semibold" style={{ color: "#b91c1c" }}>{errors.itinerary}</p>
                </div>
              )}

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
                    titleMissing={!!errors.itinerary && !String(day.title || "").trim()}
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
              <Field
                label="Package Images"
                required
                error={errors.images}
                hint={!errors.images && "up to 10 · max 10 MB each · auto-optimized for the carousel & thumbnail"}
              >
                {existingImageUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {existingImageUrls.map((src, i) => (
                      <div
                        key={`existing-${i}`}
                        className="relative group w-[72px] h-[72px] rounded-xl overflow-hidden"
                        style={{ border: "1px solid #C8DFC8" }}
                      >
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button" onClick={() => removeExistingImg(i)}
                          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {previews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {previews.map((src, i) => (
                      <div
                        key={i}
                        className="relative group w-[72px] h-[72px] rounded-xl overflow-hidden"
                        style={{ border: "1px solid #C8DFC8" }}
                        title={imageMeta[i] ? `${imageMeta[i].width}×${imageMeta[i].height}px` : undefined}
                      >
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        {imageMeta[i]?.isLowRes && (
                          <span
                            className="absolute bottom-0 inset-x-0 text-center text-[9px] font-semibold text-white py-0.5"
                            style={{ background: "rgba(180,83,9,0.85)" }}
                          >
                            Low-res
                          </span>
                        )}
                        <button
                          type="button" onClick={() => removeImg(i)}
                          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    ))}
                    {processingImages && (
                      <div
                        className="flex items-center justify-center w-[72px] h-[72px] rounded-xl"
                        style={{ border: "1px dashed #C8DFC8", background: "#F5FAF5" }}
                      >
                        <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#4a7c5f" }} />
                      </div>
                    )}
                  </div>
                )}
                <label
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center gap-2 border-2 border-dashed rounded-xl py-6 cursor-pointer transition-all"
                  style={{
                    borderColor: drag ? "#C9A84C" : errors.images ? "#dc2626" : "#C8DFC8",
                    background:  drag ? "rgba(201,168,76,0.05)" : errors.images ? "#FEF6F6" : "#F5FAF5",
                  }}
                  onMouseEnter={(e) => { if (!drag) e.currentTarget.style.borderColor = errors.images ? "#dc2626" : "#1a6b4a"; }}
                  onMouseLeave={(e) => { if (!drag) e.currentTarget.style.borderColor = errors.images ? "#dc2626" : "#C8DFC8"; }}
                >
                  <div className="p-2.5 rounded-full" style={{ background: "rgba(201,168,76,0.1)" }}>
                    <Upload className="h-5 w-5" style={{ color: "#C9A84C" }} />
                  </div>
                  <p className="text-sm" style={{ color: "#4a7c5f" }}>
                    Drop images or{" "}
                    <span className="underline font-semibold" style={{ color: "#C9A84C" }}>browse</span>
                  </p>
                  <p className="text-xs" style={{ color: "#7aaa8a" }}>
                    PNG, JPG, WEBP · {existingImageUrls.length + images.length}/10 selected
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
                disabled={busy || ok || itineraryLoading}
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
                {busy
                  ? (isEdit ? "Saving…" : "Creating…")
                  : ok
                    ? (isEdit ? "Saved!" : "Created!")
                    : (isEdit ? "Save Changes" : "Create Package")}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
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