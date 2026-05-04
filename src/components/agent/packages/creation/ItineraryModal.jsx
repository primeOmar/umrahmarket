import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, GripVertical, Loader2, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { getItinerary, saveItinerary } from "../services/packagesApi";
import { sanitizeText } from "./Packageformcomponents";

const EMPTY_DAY = (n) => ({ day: n, title: "", activities: [""] });

const ItineraryModal = ({ pkg, onClose }) => {
  const [days, setDays]       = useState([EMPTY_DAY(1)]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [collapsed, setCollapsed] = useState({});
  // Load existing itinerary
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getItinerary(pkg.id);
        const itinerary = Array.isArray(data?.days) && data.days.length ? data.days : null;
        if (!cancelled && itinerary) {
          // Normalise: ensure activities is always string[]
          setDays(
            itinerary.map((d, i) => ({
              day: d.day ?? i + 1,
              title: d.title ?? "",
              activities: Array.isArray(d.activities) && d.activities.length ? d.activities : [""],
            }))
          );
        }
      } catch {
        // No existing itinerary — keep default empty day
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pkg.id]);

  // ── day helpers ───────────────────────────────────────────────────────────

  const updateDay = (i, field, value) =>
    setDays((prev) => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d));

  const updateActivity = (dayIdx, actIdx, value) =>
    setDays((prev) =>
      prev.map((d, i) =>
        i !== dayIdx ? d : {
          ...d,
          activities: d.activities.map((a, j) => j === actIdx ? sanitizeText(value, 200) : a),
        }
      )
    );

  const addActivity = (dayIdx) =>
    setDays((prev) =>
      prev.map((d, i) => i !== dayIdx ? d : { ...d, activities: [...d.activities, ""] })
    );

  const removeActivity = (dayIdx, actIdx) =>
    setDays((prev) =>
      prev.map((d, i) =>
        i !== dayIdx ? d : { ...d, activities: d.activities.filter((_, j) => j !== actIdx) }
      )
    );

  const addDay = () => setDays((prev) => [...prev, EMPTY_DAY(prev.length + 1)]);

  const removeDay = (i) =>
    setDays((prev) =>
      prev.filter((_, idx) => idx !== i).map((d, idx) => ({ ...d, day: idx + 1 }))
    );

  const toggleCollapse = (i) =>
    setCollapsed((prev) => ({ ...prev, [i]: !prev[i] }));

  // ── submit ────────────────────────────────────────────────────────────────

  const submit = async () => {
    setSaving(true);
    try {
      const clean = days.map((d, i) => ({
        day: i + 1,
        title: sanitizeText(d.title, 120),
        activities: d.activities.map((a) => sanitizeText(a, 200)).filter(Boolean),
      }));
      await saveItinerary(pkg.id, clean);
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 1200);
    } catch (e) {
      alert(e.message || "Failed to save itinerary");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,20,12,0.65)", backdropFilter: "blur(8px)" }}
      onClick={(e) => !saving && e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-xl bg-white rounded-3xl flex flex-col"
        style={{
          maxHeight: "90vh",
          border: "1px solid #C8DFC8",
          boxShadow: "0 24px 80px rgba(13,61,43,0.18)",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 flex-shrink-0" style={{ borderBottom: "1px solid #E0EFE0" }}>
          <div>
            <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: "#C9A84C" }}>
              Daily Itinerary
            </p>
            <h2 className="text-lg font-bold leading-tight" style={{ color: "#0D3D2B" }}>
              {pkg.name}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "#7aaa8a" }}>
              {days.length} day{days.length !== 1 ? "s" : ""} planned
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-2 rounded-full transition-colors disabled:opacity-40 flex-shrink-0"
            style={{ background: "#F0F8F0", border: "1px solid #C8DFC8" }}
          >
            <X className="h-4 w-4" style={{ color: "#0D3D2B" }} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin" style={{ color: "#0D3D2B" }} />
            </div>
          ) : (
            <>
              {days.map((day, dayIdx) => (
                <div
                  key={dayIdx}
                  className="rounded-2xl overflow-hidden"
                  style={{ border: "1px solid #C8DFC8", background: "#F8FCF8" }}
                >
                  {/* Day header row */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                    style={{ background: "#F0F8F0" }}
                    onClick={() => toggleCollapse(dayIdx)}
                  >
                    {/* Day badge */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: "linear-gradient(135deg,#0D3D2B,#1a6b4a)", color: "#fff" }}
                    >
                      {day.day}
                    </div>

                    {/* Title input */}
                    <input
                      type="text"
                      value={day.title}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateDay(dayIdx, "title", sanitizeText(e.target.value, 120))}
                      placeholder={`Day ${day.day} — e.g. Arrival & Check-in`}
                      className="flex-1 bg-transparent text-sm font-semibold focus:outline-none placeholder-gray-400"
                      style={{ color: "#0D3D2B" }}
                    />

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {days.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeDay(dayIdx); }}
                          className="p-1 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </button>
                      )}
                      {collapsed[dayIdx]
                        ? <ChevronDown className="h-4 w-4" style={{ color: "#7aaa8a" }} />
                        : <ChevronUp className="h-4 w-4" style={{ color: "#7aaa8a" }} />
                      }
                    </div>
                  </div>

                  {/* Activities */}
                  {!collapsed[dayIdx] && (
                    <div className="px-4 pb-3 pt-2 space-y-2">
                      {day.activities.map((act, actIdx) => (
                        <div key={actIdx} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#C9A84C" }} />
                          <input
                            type="text"
                            value={act}
                            onChange={(e) => updateActivity(dayIdx, actIdx, e.target.value)}
                            placeholder="e.g. Transfer to hotel, Perform Tawaf…"
                            className="flex-1 text-sm px-3 py-2 rounded-xl focus:outline-none transition-all"
                            style={{
                              background: "#EEF5EE",
                              border: "1px solid #C8DFC8",
                              color: "#0D3D2B",
                            }}
                            onFocus={(e) => { e.target.style.borderColor = "#C9A84C"; e.target.style.boxShadow = "0 0 0 3px rgba(201,168,76,0.15)"; }}
                            onBlur={(e) => { e.target.style.borderColor = "#C8DFC8"; e.target.style.boxShadow = "none"; }}
                          />
                          {day.activities.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeActivity(dayIdx, actIdx)}
                              className="p-1 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                            >
                              <X className="h-3.5 w-3.5 text-red-400" />
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => addActivity(dayIdx)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors mt-1"
                        style={{ color: "#1a6b4a", background: "rgba(13,61,43,0.06)" }}
                      >
                        <Plus className="h-3.5 w-3.5" /> Add activity
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Add Day */}
              <button
                type="button"
                onClick={addDay}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed text-sm font-semibold transition-all"
                style={{ borderColor: "#C8DFC8", color: "#4a7c5f" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C9A84C"; e.currentTarget.style.color = "#C9A84C"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#C8DFC8"; e.currentTarget.style.color = "#4a7c5f"; }}
              >
                <Plus className="h-4 w-4" /> Add Day {days.length + 1}
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderTop: "1px solid #E0EFE0" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
            style={{ color: "#0D3D2B", background: "#F0F8F0", border: "1px solid #C8DFC8" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || saved || loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
            style={{
              background: saved
                ? "linear-gradient(135deg,#1a6b4a,#0D3D2B)"
                : "linear-gradient(135deg,#C9A84C,#a8882f)",
              color: saved ? "#fff" : "#0A2E1F",
              boxShadow: "0 4px 16px rgba(201,168,76,0.3)",
            }}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saved  && <CheckCircle2 className="h-4 w-4" />}
            {saving ? "Saving…" : saved ? "Saved!" : "Save Itinerary"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItineraryModal;
