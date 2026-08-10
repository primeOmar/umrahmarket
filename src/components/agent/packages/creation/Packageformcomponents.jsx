import React, { useState, useEffect, useRef } from "react";
import {
  X, Plus, Star, ChevronDown, ChevronLeft, ChevronRight, MapPin, Building2,
  AlertCircle, Calendar,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Sanitisation helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Max lengths per field type */
const MAX = {
  short:       120,   // names, hotel names, distances, addresses
  description: 1200,  // free-text descriptions
  tag:         80,    // highlight / inclusion / exclusion tags
  number:      12,    // price / size strings before conversion
  date:        10,    // YYYY-MM-DD
};

/**
 * Strip HTML tags, null bytes and control characters.
 * Collapses runs of whitespace to a single space.
 * Trims to `maxLen` characters.
 */
export function sanitizeText(value = "", maxLen = MAX.short) {
  return String(value)
    // remove null bytes
    .replace(/\0/g, "")
    // strip any HTML / script tags
    .replace(/<[^>]*>/g, "")
    // remove HTML entities that could be used to smuggle tags after decoding
    .replace(/&(?:#x?[\da-f]+|[a-z]+);/gi, "")
    // strip other control characters (keep newlines for textarea)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // collapse multiple spaces / tabs
    .replace(/[ \t]+/g, " ")
    .trimStart()
    .slice(0, maxLen);
}

/**
 * Allow only digits and one optional decimal point.
 * Everything else (letters, SQL operators, shell metacharacters …) is removed.
 */
export function sanitizeNumber(value = "", maxLen = MAX.number) {
  const stripped = String(value).replace(/[^\d.]/g, "");
  // ensure at most one decimal point
  const parts = stripped.split(".");
  const result = parts.length > 1
    ? `${parts[0]}.${parts.slice(1).join("")}`
    : stripped;
  return result.slice(0, maxLen);
}

/**
 * Accept only a strict YYYY-MM-DD date string; return "" for anything else.
 */
export function sanitizeDate(value = "") {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value).trim()) ? value.trim() : "";
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared styling constants
// ─────────────────────────────────────────────────────────────────────────────

export const inputCls = [
  "w-full px-3.5 py-2.5 rounded-xl text-sm transition-all",
  "focus:outline-none",
].join(" ");

export const inputStyle = {
  background: "#EEF5EE",
  border: "1px solid #C8DFC8",
  color: "#0D3D2B",
};

// Applied inline (merged into an input's `style`) whenever that field has a
// live validation error — a red ring that matches the same visual language
// as the gold focus ring, so it reads as "this needs attention" without a
// jarring style clash.
export const errorRingStyle = {
  borderColor: "#dc2626",
  boxShadow: "0 0 0 3px rgba(220,38,38,0.12)",
};

const focusOn  = (e) => {
  e.target.style.borderColor = "#C9A84C";
  e.target.style.boxShadow   = "0 0 0 3px rgba(201,168,76,0.15)";
};
const focusOff = (e) => {
  e.target.style.borderColor = "#C8DFC8";
  e.target.style.boxShadow   = "none";
};

// ─────────────────────────────────────────────────────────────────────────────
// InputEl
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Text / number / date input.
 *
 * `sanitize` prop controls which sanitisation function to apply:
 *   "text"   (default) → sanitizeText
 *   "number"           → sanitizeNumber
 *   "date"             → sanitizeDate
 *   "none"             → raw value (use only when the parent already sanitises)
 */
export const InputEl = ({
  className = "",
  style = {},
  onChange,
  sanitize = "text",
  maxLen,
  ...props
}) => {
  const handleChange = (e) => {
    if (!onChange) return;
    let val = e.target.value;

    if (sanitize === "text")   val = sanitizeText(val, maxLen ?? MAX.short);
    if (sanitize === "number") val = sanitizeNumber(val, maxLen ?? MAX.number);
    if (sanitize === "date")   val = sanitizeDate(val);
    // "none" → pass through untouched

    // Mutate the synthetic event value so callers receive the clean value
    const syntheticEvent = { ...e, target: { ...e.target, value: val } };
    onChange(syntheticEvent);
  };

  return (
    <input
      className={`${inputCls} ${className}`}
      style={{ ...inputStyle, ...style }}
      onFocus={focusOn}
      onBlur={focusOff}
      onChange={handleChange}
      {...props}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TextareaEl
// ─────────────────────────────────────────────────────────────────────────────

export const TextareaEl = ({ className = "", onChange, maxLen, ...props }) => {
  const handleChange = (e) => {
    if (!onChange) return;
    const val = sanitizeText(e.target.value, maxLen ?? MAX.description);
    onChange({ ...e, target: { ...e.target, value: val } });
  };

  return (
    <textarea
      className={`${inputCls} resize-none ${className}`}
      style={inputStyle}
      onFocus={focusOn}
      onBlur={focusOff}
      onChange={handleChange}
      {...props}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Field
// ─────────────────────────────────────────────────────────────────────────────

export const Field = ({ label, required, hint, error, children }) => (
  <div className="space-y-1.5">
    <label
      className="flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase"
      style={{ color: error ? "#dc2626" : "#4a7c5f" }}
    >
      {label}
      {required && <span style={{ color: error ? "#dc2626" : "#C9A84C" }}>*</span>}
      {hint && !error && (
        <span className="normal-case font-normal ml-1" style={{ color: "#7aaa8a" }}>
          — {sanitizeText(hint, 80)}
        </span>
      )}
    </label>
    {children}
    {error && (
      <p className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#dc2626" }}>
        <AlertCircle className="h-3 w-3 flex-shrink-0" />
        {sanitizeText(error, 100)}
      </p>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Sel (Select)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Allowlisted-value select.
 * Only values that already exist as <option> children can be submitted,
 * so no sanitisation of the value itself is required here—the browser
 * enforces this natively, and server-side validation should also allowlist.
 */
export const Sel = ({ value, onChange, children }) => (
  <div className="relative">
    <select
      value={value}
      onChange={onChange}
      className={`${inputCls} appearance-none pr-9 cursor-pointer`}
      style={inputStyle}
      onFocus={focusOn}
      onBlur={focusOff}
    >
      {children}
    </select>
    <ChevronDown
      className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
      style={{ color: "#4a7c5f" }}
    />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Stars (Star rating)
// ─────────────────────────────────────────────────────────────────────────────

export const Stars = ({ value, onChange, error }) => (
  <div
    className="flex gap-1 h-[42px] items-center rounded-xl transition-all"
    style={
      error
        ? { boxShadow: "0 0 0 3px rgba(220,38,38,0.12)", paddingLeft: 6 }
        : {}
    }
  >
    {[1, 2, 3, 4, 5, 6].map((n) => (
      <button
        key={n}
        type="button"
        onClick={() => onChange(value === n ? "" : n)}
      >
        <Star
          className={`h-5 w-5 transition-colors ${
            n <= Number(value) ? "fill-amber-400 text-amber-400" : ""
          }`}
          style={n <= Number(value) ? {} : { color: "#C8DFC8" }}
        />
      </button>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// TagInput
// ─────────────────────────────────────────────────────────────────────────────

/** Maximum tags allowed per list */
const MAX_TAGS = 30;

export const TagInput = ({ placeholder, items, onChange, color = "gold" }) => {
  const [val, setVal] = useState("");

  const palette = {
    gold:  { bg: "rgba(201,168,76,0.10)",  text: "#8a6a1a", border: "rgba(201,168,76,0.3)"  },
    green: { bg: "rgba(13,61,43,0.07)",    text: "#0D3D2B", border: "rgba(13,61,43,0.2)"   },
    red:   { bg: "rgba(220,38,38,0.07)",   text: "#b91c1c", border: "rgba(220,38,38,0.2)"  },
  };
  const p = palette[color] || palette.gold;

  const add = () => {
    const t = sanitizeText(val, MAX.tag);
    if (t && !items.includes(t) && items.length < MAX_TAGS) {
      onChange([...items, t]);
    }
    setVal("");
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <InputEl
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={sanitizeText(placeholder ?? "", 60)}
          className="flex-1"
          sanitize="text"
          maxLen={MAX.tag}
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2.5 rounded-xl font-bold transition-colors text-white flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#C9A84C,#a8882f)" }}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border"
              style={{ background: p.bg, color: p.text, borderColor: p.border }}
            >
              {/* Render as text node — never dangerouslySetInnerHTML */}
              {item}
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                className="hover:opacity-60 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// RadioPillGroup — single-select allowlisted pills (replaces <select> for
// short, known option sets so the agent taps instead of opening a dropdown)
// ─────────────────────────────────────────────────────────────────────────────

const RADIO_PILL_COLORS = {
  green: {
    on:  { background: "linear-gradient(135deg,#0D3D2B,#1a6b4a)", color: "#fff", borderColor: "transparent" },
    off: { background: "#F5FAF5", color: "#4a7c5f", borderColor: "#C8DFC8" },
  },
  gold: {
    on:  { background: "linear-gradient(135deg,#C9A84C,#a8882f)", color: "#fff", borderColor: "transparent" },
    off: { background: "#F5FAF5", color: "#6b5a1a", borderColor: "#e0cc8a" },
  },
};

/**
 * options: [{ value, label, icon? }]
 * `value` is compared with strict equality — parent state must only ever be
 * set to one of the option values, so no free-text sanitisation is needed
 * here (mirrors the <Sel> allowlist pattern above).
 */
export const RadioPillGroup = ({ options, value, onChange, color = "green", size = "md" }) => {
  const c = RADIO_PILL_COLORS[color] || RADIO_PILL_COLORS.green;
  const pad = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm";
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center gap-1.5 rounded-xl font-semibold border transition-all ${pad}`}
            style={{ ...(active ? c.on : c.off), borderWidth: "1px", borderStyle: "solid" }}
          >
            {opt.icon && <span className="leading-none">{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PresetChips — quick-tap presets for numeric/short fields, with a small
// custom input as fallback. Lets an agent tap "14" instead of typing it.
// ─────────────────────────────────────────────────────────────────────────────

export const PresetChips = ({
  options,              // array of primitives OR [{ label, value }]
  value,
  onChange,
  suffix = "",
  color = "gold",
  sanitize = "number",
  maxLen,
  inputType = "number",
  customPlaceholder = "Custom",
}) => {
  const c = RADIO_PILL_COLORS[color] || RADIO_PILL_COLORS.gold;
  const norm = (v) => String(v ?? "");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const optValue = typeof opt === "object" ? opt.value : opt;
          const optLabel = typeof opt === "object" ? opt.label : opt;
          const active = norm(value) === norm(optValue);
          return (
            <button
              key={optValue}
              type="button"
              onClick={() => onChange(String(optValue))}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
              style={{ ...(active ? c.on : c.off), borderWidth: "1px", borderStyle: "solid" }}
            >
              {optLabel}{suffix}
            </button>
          );
        })}
      </div>
      <InputEl
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={customPlaceholder}
        sanitize={sanitize}
        maxLen={maxLen}
        className="max-w-[140px]"
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Date helpers (local-time, no UTC shifting — a "YYYY-MM-DD" string always
// means that calendar day, regardless of the browser's timezone)
// ─────────────────────────────────────────────────────────────────────────────

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad2 = (n) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" -> local Date at midnight, or null */
function parseYMD(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(str || ""))) return null;
  const [y, m, d] = str.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** local Date -> "YYYY-MM-DD" */
function formatYMD(dt) {
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

/** local Date -> "Mon, 12 Aug 2027" (short, readable, unambiguous) */
function formatDisplay(dt) {
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getDay()];
  return `${weekday}, ${dt.getDate()} ${MONTHS[dt.getMonth()].slice(0, 3)} ${dt.getFullYear()}`;
}

const sameDay = (a, b) => !!a && !!b && a.getTime() === b.getTime();
const addMonths = (dt, n) => new Date(dt.getFullYear(), dt.getMonth() + n, 1);
const stripTime = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());

function buildMonthGrid(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ─────────────────────────────────────────────────────────────────────────────
// DateRangePicker
// ─────────────────────────────────────────────────────────────────────────────
//
// A single popover calendar shared by both the check-in and check-out
// fields. The whole point: once you pick check-in, the SAME calendar view
// stays open — already on the right month — and just switches into
// "pick check-out" mode with the check-in day highlighted as the anchor.
// No re-opening a second picker that resets back to today and forces you
// to scroll forward through months you just navigated past.
//
export const DateRangePicker = ({
  checkIn,
  checkOut,
  onChangeCheckIn,
  onChangeCheckOut,
  errorCheckIn,
  errorCheckOut,
}) => {
  const checkInDate  = parseYMD(checkIn);
  const checkOutDate = parseYMD(checkOut);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("checkin"); // "checkin" | "checkout"
  const [viewDate, setViewDate] = useState(checkInDate || new Date());
  const [hoverDate, setHoverDate] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const openFor = (field) => {
    setMode(field);
    // Anchor the view on whichever date is most relevant — never on
    // "today" if the user has already been browsing a future month.
    const anchor =
      field === "checkin"
        ? checkInDate || checkOutDate
        : checkOutDate || checkInDate;
    setViewDate(anchor || new Date());
    setHoverDate(null);
    setOpen(true);
  };

  const handleDayClick = (day) => {
    if (mode === "checkin") {
      onChangeCheckIn(formatYMD(day));
      // Existing check-out no longer valid against the new check-in — clear it.
      if (checkOutDate && day.getTime() >= checkOutDate.getTime()) {
        onChangeCheckOut("");
      }
      // Stay open, same month in view, just switch to picking check-out.
      setMode("checkout");
      setHoverDate(null);
      return;
    }
    // mode === "checkout"
    if (checkInDate && day.getTime() <= checkInDate.getTime()) {
      // Picked on/before check-in — treat it as restarting the range.
      onChangeCheckIn(formatYMD(day));
      onChangeCheckOut("");
      setMode("checkout");
      setHoverDate(null);
      return;
    }
    onChangeCheckOut(formatYMD(day));
    setOpen(false);
  };

  const cells = buildMonthGrid(viewDate);
  const today = stripTime(new Date());

  const rangeStart = checkInDate;
  const rangeEnd =
    mode === "checkout" && checkInDate && !checkOutDate
      ? hoverDate // live preview while hunting for check-out
      : checkOutDate;

  const pillBaseStyle = (hasError, isActiveMode) => ({
    background: hasError ? "#FEF6F6" : "#EEF5EE",
    border: hasError
      ? "1px solid #f3a5a5"
      : isActiveMode && open
      ? "1px solid #C9A84C"
      : "1px solid #C8DFC8",
    boxShadow: isActiveMode && open ? "0 0 0 3px rgba(201,168,76,0.15)" : "none",
  });

  return (
    <div className="relative" ref={rootRef}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Check-in" error={errorCheckIn}>
          <button
            type="button"
            onClick={() => openFor("checkin")}
            className={`${inputCls} flex items-center justify-between gap-2 text-left`}
            style={pillBaseStyle(errorCheckIn, mode === "checkin")}
          >
            <span className={checkInDate ? "" : "opacity-50"}>
              {checkInDate ? formatDisplay(checkInDate) : "Select date"}
            </span>
            <Calendar className="h-4 w-4 flex-shrink-0" style={{ color: "#7aaa8a" }} />
          </button>
        </Field>
        <Field label="Check-out" error={errorCheckOut}>
          <button
            type="button"
            onClick={() => openFor("checkout")}
            className={`${inputCls} flex items-center justify-between gap-2 text-left`}
            style={pillBaseStyle(errorCheckOut, mode === "checkout")}
          >
            <span className={checkOutDate ? "" : "opacity-50"}>
              {checkOutDate ? formatDisplay(checkOutDate) : "Select date"}
            </span>
            <Calendar className="h-4 w-4 flex-shrink-0" style={{ color: "#7aaa8a" }} />
          </button>
        </Field>
      </div>

      {open && (
        <div
          className="absolute left-0 right-0 z-50 mt-2 rounded-2xl p-4 shadow-xl"
          style={{ background: "#FDFDF9", border: "1px solid #C8DFC8" }}
        >
          {/* Mode indicator — tells the user exactly what tapping a day will do */}
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "#C9A84C" }}
          >
            {mode === "checkin" ? "Select check-in date" : "Now select check-out date"}
          </p>

          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewDate((v) => addMonths(v, -1))}
              className="p-1.5 rounded-lg transition-colors hover:bg-black/5"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" style={{ color: "#0D3D2B" }} />
            </button>
            <span className="text-sm font-bold" style={{ color: "#0D3D2B" }}>
              {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() => setViewDate((v) => addMonths(v, 1))}
              className="p-1.5 rounded-lg transition-colors hover:bg-black/5"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" style={{ color: "#0D3D2B" }} />
            </button>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="text-center text-[10px] font-bold uppercase"
                style={{ color: "#7aaa8a" }}
              >
                {w}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;

              const isStart = sameDay(day, rangeStart);
              const isEnd = sameDay(day, rangeEnd);
              const inRange =
                rangeStart &&
                rangeEnd &&
                day.getTime() > Math.min(rangeStart.getTime(), rangeEnd.getTime()) &&
                day.getTime() < Math.max(rangeStart.getTime(), rangeEnd.getTime());
              const isToday = sameDay(day, today);
              const disabled =
                mode === "checkout" && checkInDate && day.getTime() <= checkInDate.getTime();

              const col = i % 7;
              const stripRounded = isStart
                ? "rounded-l-full"
                : isEnd
                ? "rounded-r-full"
                : col === 0
                ? "rounded-l-full"
                : col === 6
                ? "rounded-r-full"
                : "";

              return (
                <div
                  key={formatYMD(day)}
                  className={`relative flex items-center justify-center h-9 ${
                    (inRange || isStart || isEnd) ? stripRounded : ""
                  }`}
                  style={
                    inRange || isStart || isEnd
                      ? { background: "rgba(201,168,76,0.14)" }
                      : {}
                  }
                >
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleDayClick(day)}
                    onMouseEnter={() => mode === "checkout" && setHoverDate(day)}
                    className="h-8 w-8 flex items-center justify-center rounded-full text-xs font-semibold transition-colors"
                    style={
                      isStart || isEnd
                        ? { background: "#0D3D2B", color: "#fff" }
                        : disabled
                        ? { color: "#C8DFC8", cursor: "not-allowed" }
                        : isToday
                        ? { color: "#C9A84C", border: "1px solid #C9A84C" }
                        : { color: "#0D3D2B" }
                    }
                    onMouseOver={(e) => {
                      if (!disabled && !isStart && !isEnd) e.currentTarget.style.background = "#EEF5EE";
                    }}
                    onMouseOut={(e) => {
                      if (!disabled && !isStart && !isEnd) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {day.getDate()}
                  </button>
                </div>
              );
            })}
          </div>

          {checkInDate && (
            <button
              type="button"
              onClick={() => { onChangeCheckIn(""); onChangeCheckOut(""); setMode("checkin"); setHoverDate(null); }}
              className="mt-3 text-xs font-semibold underline"
              style={{ color: "#7aaa8a" }}
            >
              Clear dates
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HotelBlock
// ─────────────────────────────────────────────────────────────────────────────

// `city`: normalised city key (e.g. "makkah", "madinah", "jeddah", or any
// custom city an agent typed in) — used as the prefix for this block's form
// fields (`${city}_hotel_name`, etc.), so any city works with no special-casing.
// `label`: display name for the city. Falls back to a title-cased version of
// `city` if not passed, so older call-sites that relied on the previous
// makkah/madinah-only default still render sensibly.
// `required`: true when this city must be filled in for the package to be
// complete (Makkah always; every other selected city too, since an agent
// only sees this block at all once they've explicitly picked that city).
// `errors`: { name, rating, checkIn, checkOut } — each an error message
// string or undefined, keyed to this city's fields.
export const HotelBlock = ({ city, label, icon, formData, set, required = false, errors = {} }) => {
  const resolvedLabel = label || (city === "makkah" ? "Makkah" : city === "madinah" ? "Madinah" : city.charAt(0).toUpperCase() + city.slice(1));
  const hint  = city === "makkah" ? "distance from Haram" : city === "madinah" ? "distance from Prophet's Mosque" : "distance from city centre";
  const hasError = !!(errors.name || errors.rating || errors.checkIn || errors.checkOut);
  // Dynamically-added cities may not have their fields in `formData` yet
  // (they're only initialised the first time the agent types into a field),
  // so every read here falls back to "" rather than letting `undefined`
  // reach a controlled input.
  const val = (suffix) => formData[`${city}_${suffix}`] ?? "";

  return (
    <div
      className="rounded-2xl p-5 space-y-4 transition-colors"
      style={{
        background: hasError ? "#FEF6F6" : "#F0F8F0",
        border: hasError ? "1px solid #f3a5a5" : "1px solid #C8DFC8",
      }}
    >
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg" style={{ background: "rgba(201,168,76,0.12)" }}>
          {icon}
        </div>
        <h3 className="font-bold text-sm" style={{ color: "#0D3D2B" }}>
          {resolvedLabel} Hotel
        </h3>
        <span
          className="ml-auto text-xs font-bold uppercase tracking-wide"
          style={{ color: hasError ? "#dc2626" : required ? "#C9A84C" : "#7aaa8a" }}
        >
          {required ? "required" : "optional"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Hotel Name" error={errors.name}>
          <InputEl
            value={val("hotel_name")}
            onChange={(e) => set(`${city}_hotel_name`, e.target.value)}
            placeholder={`e.g. Mövenpick ${resolvedLabel}`}
            sanitize="text"
            style={errors.name ? errorRingStyle : {}}
          />
        </Field>
        <Field label="Star Rating" error={errors.rating}>
          <Stars
            value={val("hotel_rating")}
            onChange={(v) => set(`${city}_hotel_rating`, v)}
            error={errors.rating}
          />
        </Field>
      </div>

      <Field label="Distance" hint={hint}>
        <InputEl
          value={val("hotel_distance")}
          onChange={(e) => set(`${city}_hotel_distance`, e.target.value)}
          placeholder="e.g. 200m"
          sanitize="text"
          maxLen={30}
        />
      </Field>

      <Field label="Address">
        <InputEl
          value={val("hotel_address")}
          onChange={(e) => set(`${city}_hotel_address`, e.target.value)}
          placeholder="Optional address"
          sanitize="text"
        />
      </Field>

      <DateRangePicker
        checkIn={val("check_in_date")}
        checkOut={val("check_out_date")}
        onChangeCheckIn={(v) => set(`${city}_check_in_date`, sanitizeDate(v))}
        onChangeCheckOut={(v) => set(`${city}_check_out_date`, sanitizeDate(v))}
        errorCheckIn={errors.checkIn}
        errorCheckOut={errors.checkOut}
      />

      {val("check_in_date") && val("check_out_date") && (
        <p className="text-xs font-semibold" style={{ color: "#C9A84C" }}>
          🌙{" "}
          {Math.max(
            0,
            Math.round(
              (new Date(val("check_out_date")) -
                new Date(val("check_in_date"))) /
                86400000
            )
          )}{" "}
          nights in {resolvedLabel}
        </p>
      )}
    </div>
  );
};