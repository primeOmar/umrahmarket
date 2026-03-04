import React, { useState, useRef } from "react";
import { X, Upload, Trash2, Loader2, CheckCircle2, AlertCircle, MapPin, Building2} from "lucide-react";
import { createPackage } from "../services/packagesApi";
import { Field, sanitizeText,sanitizeNumber,sanitizeDate, InputEl, TextareaEl, Sel, Stars,TagInput,HotelBlock, } from "./Packageformcomponents";


const STEPS = ["Basic Info", "Hotels", "Pricing & Dates", "Details & Images"];

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


function sanitizeFormPayload(form) {
  return {
    ...form,
    // ── text fields ─────────────────────────────────────────────────────────
    name:                  sanitizeText(form.name, 120),
    type:                  ["umrah", "hajj"].includes(form.type) ? form.type : "umrah",
    location:              ["makkah", "madinah", "jeddah"].includes(form.location)
                             ? form.location : "makkah",
    description:           sanitizeText(form.description, 1200),

    // ── pricing ─────────────────────────────────────────────────────────────
    price:                 sanitizeNumber(form.price),
    original_price:        sanitizeNumber(form.original_price),
    discount:              sanitizeNumber(form.discount),
    duration:              sanitizeNumber(form.duration),

    // ── group sizes ─────────────────────────────────────────────────────────
    min_group_size:        sanitizeNumber(form.min_group_size),
    max_group_size:        sanitizeNumber(form.max_group_size),

    // ── dates ───────────────────────────────────────────────────────────────
    available_from:        sanitizeDate(form.available_from),
    available_to:          sanitizeDate(form.available_to),

    // ── hotel fields (makkah) ───────────────────────────────────────────────
    makkah_hotel_name:     sanitizeText(form.makkah_hotel_name, 120),
    makkah_hotel_rating:   Number(form.makkah_hotel_rating) || "",
    makkah_hotel_distance: sanitizeText(form.makkah_hotel_distance, 30),
    makkah_hotel_address:  sanitizeText(form.makkah_hotel_address, 120),
    makkah_check_in_date:  sanitizeDate(form.makkah_check_in_date),
    makkah_check_out_date: sanitizeDate(form.makkah_check_out_date),

    // ── hotel fields (madinah) ──────────────────────────────────────────────
    madinah_hotel_name:     sanitizeText(form.madinah_hotel_name, 120),
    madinah_hotel_rating:   Number(form.madinah_hotel_rating) || "",
    madinah_hotel_distance: sanitizeText(form.madinah_hotel_distance, 30),
    madinah_hotel_address:  sanitizeText(form.madinah_hotel_address, 120),
    madinah_check_in_date:  sanitizeDate(form.madinah_check_in_date),
    madinah_check_out_date: sanitizeDate(form.madinah_check_out_date),

    // ── tag arrays ──────────────────────────────────────────────────────────
    highlights: form.highlights.map((t) => sanitizeText(t, 80)).filter(Boolean),
    inclusions: form.inclusions.map((t) => sanitizeText(t, 80)).filter(Boolean),
    exclusions: form.exclusions.map((t) => sanitizeText(t, 80)).filter(Boolean),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// StepBar
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// CreatePackageModal
// ─────────────────────────────────────────────────────────────────────────────

const CreatePackageModal = ({ isOpen, onClose, onSave }) => {
  const [form, setForm]     = useState(EMPTY);
  const [step, setStep]     = useState(0);
  const [images, setImages] = useState([]);
  const [previews, setPrev] = useState([]);
  const [drag, setDrag]     = useState(false);
  const [status, setStatus] = useState("idle");
  const [err, setErr]       = useState("");
  const fileRef             = useRef(null);

  if (!isOpen) return null;

  const set    = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const isLast = step === STEPS.length - 1;
  const busy   = status === "loading";
  const ok     = status === "success";

  // ── image helpers ──────────────────────────────────────────────────────────

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

  const addFiles = (files) => {
    const valid = Array.from(files).filter(
      (f) => ALLOWED_TYPES.includes(f.type) && f.size <= 10_485_760
    );
    const next = [...images, ...valid].slice(0, 10);
    setImages(next);
    Promise.all(
      next.map(
        (f) =>
          new Promise((res) => {
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
        (f) =>
          new Promise((res) => {
            const r = new FileReader();
            r.onload = (e) => res(e.target.result);
            r.readAsDataURL(f);
          })
      )
    ).then(setPrev);
  };

  // ── submit ─────────────────────────────────────────────────────────────────

  const submit = async () => {
    setStatus("loading");
    setErr("");
    try {
      const cleanForm = sanitizeFormPayload(form);
      const result    = await createPackage(cleanForm, images);
      setStatus("success");
      onSave?.(result.package);
      setTimeout(() => {
        setStatus("idle");
        setForm(EMPTY);
        setStep(0);
        setImages([]);
        setPrev([]);
        onClose?.();
      }, 1500);
    } catch (e) {
      setErr(sanitizeText(e.message || "Something went wrong", 200));
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
          boxShadow:
            "0 24px 80px rgba(13,61,43,0.18), 0 0 0 1px rgba(201,168,76,0.08)",
        }}
      >
        {/* ── header ────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between px-6 pt-5 pb-2 flex-shrink-0">
          <div>
            <p
              className="text-xs font-bold tracking-widest uppercase mb-1"
              style={{ color: "#C9A84C" }}
            >
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

        {/* ── error banner ───────────────────────────────────────────────────── */}
        {status === "error" && (
          <div
            className="mx-6 mb-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
            style={{
              background: "rgba(220,38,38,0.06)",
              border: "1px solid rgba(220,38,38,0.2)",
              color: "#b91c1c",
            }}
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {err}
          </div>
        )}

        {/* ── scrollable content ─────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-6 pb-3 space-y-4">

          {/* STEP 0 — Basic Info */}
          {step === 0 && (
            <>
              <Field label="Package Name" required>
                <InputEl
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. 14-Night Hajj Gold Package"
                  sanitize="text"
                  maxLen={120}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type" required>
                  <Sel value={form.type} onChange={(e) => set("type", e.target.value)}>
                    <option value="umrah">🕋  Umrah</option>
                    <option value="hajj">☪️  Hajj</option>
                  </Sel>
                </Field>
                <Field label="Primary Location" required>
                  <Sel value={form.location} onChange={(e) => set("location", e.target.value)}>
                    <option value="makkah">Makkah</option>
                    <option value="madinah">Madinah</option>
                    <option value="jeddah">Jeddah</option>
                  </Sel>
                </Field>
              </div>
              <Field label="Description">
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

          {/* STEP 1 — Hotels */}
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
            </>
          )}

          {/* STEP 2 — Pricing & Dates */}
          {step === 2 && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Price (USD)" required>
                  <div className="relative">
                    <span
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
                      style={{ color: "#7aaa8a" }}
                    >
                      $
                    </span>
                    <InputEl
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => set("price", e.target.value)}
                      placeholder="0.00"
                      className="pl-7"
                      sanitize="number"
                    />
                  </div>
                </Field>
                <Field label="Original Price">
                  <div className="relative">
                    <span
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
                      style={{ color: "#7aaa8a" }}
                    >
                      $
                    </span>
                    <InputEl
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.original_price}
                      onChange={(e) => set("original_price", e.target.value)}
                      placeholder="0.00"
                      className="pl-7"
                      sanitize="number"
                    />
                  </div>
                </Field>
                <Field label="Discount %" hint="0–100">
                  <InputEl
                    type="number"
                    min="0"
                    max="100"
                    value={form.discount}
                    onChange={(e) => set("discount", e.target.value)}
                    placeholder="0"
                    sanitize="number"
                  />
                </Field>
              </div>

              <Field label="Duration (days)" required>
                <InputEl
                  type="number"
                  min="1"
                  value={form.duration}
                  onChange={(e) => set("duration", e.target.value)}
                  placeholder="e.g. 14"
                  sanitize="number"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Available From">
                  <InputEl
                    type="date"
                    value={form.available_from}
                    onChange={(e) => set("available_from", e.target.value)}
                    sanitize="date"
                  />
                </Field>
                <Field label="Available To">
                  <InputEl
                    type="date"
                    value={form.available_to}
                    onChange={(e) => set("available_to", e.target.value)}
                    sanitize="date"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Min Group Size">
                  <InputEl
                    type="number"
                    min="1"
                    value={form.min_group_size}
                    onChange={(e) => set("min_group_size", e.target.value)}
                    sanitize="number"
                  />
                </Field>
                <Field label="Max Group Size">
                  <InputEl
                    type="number"
                    min="1"
                    value={form.max_group_size}
                    onChange={(e) => set("max_group_size", e.target.value)}
                    sanitize="number"
                  />
                </Field>
              </div>
            </>
          )}

          {/* STEP 3 — Details & Images */}
          {step === 3 && (
            <>
              <Field label="Highlights" hint="press Enter or + to add">
                <TagInput
                  placeholder="e.g. Guided Ziyarah tour"
                  items={form.highlights}
                  onChange={(v) => set("highlights", v)}
                  color="gold"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Inclusions">
                  <TagInput
                    placeholder="e.g. Hotel, Visa"
                    items={form.inclusions}
                    onChange={(v) => set("inclusions", v)}
                    color="green"
                  />
                </Field>
                <Field label="Exclusions">
                  <TagInput
                    placeholder="e.g. Flights"
                    items={form.exclusions}
                    onChange={(v) => set("exclusions", v)}
                    color="red"
                  />
                </Field>
              </div>

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
                          type="button"
                          onClick={() => removeImg(i)}
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
                    <span className="underline font-semibold" style={{ color: "#C9A84C" }}>
                      browse
                    </span>
                  </p>
                  <p className="text-xs" style={{ color: "#7aaa8a" }}>
                    PNG, JPG, WEBP · {images.length}/10 selected
                  </p>
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </Field>
            </>
          )}
        </div>

        {/* ── footer ─────────────────────────────────────────────────────────── */}
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
            {/* dot indicators */}
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