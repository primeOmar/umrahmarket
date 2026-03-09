/**
 * Toast.jsx — zero-setup toast notifications, no Provider needed.
 *
 * Import and call anywhere:
 *   import toast from "./Toast";
 *   toast.success("Package saved!");
 *   toast.error("Something went wrong, please try again.");
 *   toast.warning("Check your inputs.");
 *   toast.info("Draft auto-saved.");
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";

const VARIANTS = {
  success: {
    Icon:       CheckCircle2,
    bg:         "#E8F5E9",
    border:     "#A5D6A7",
    iconColor:  "#1a6b4a",
    titleColor: "#0D3D2B",
    barColor:   "linear-gradient(90deg,#0D3D2B,#1a6b4a)",
  },
  error: {
    Icon:       AlertCircle,
    bg:         "#FEECEC",
    border:     "#FFCDD2",
    iconColor:  "#b91c1c",
    titleColor: "#7f1d1d",
    barColor:   "linear-gradient(90deg,#ef4444,#b91c1c)",
  },
  warning: {
    Icon:       AlertTriangle,
    bg:         "#FFF8E1",
    border:     "#FFE082",
    iconColor:  "#C9A84C",
    titleColor: "#7a5a10",
    barColor:   "linear-gradient(90deg,#C9A84C,#a8882f)",
  },
  info: {
    Icon:       Info,
    bg:         "#E8F4FD",
    border:     "#90CAF9",
    iconColor:  "#1a6b4a",
    titleColor: "#0D3D2B",
    barColor:   "linear-gradient(90deg,#1a6b4a,#4a7c5f)",
  },
};

const DURATION = 4000;

const ToastItem = ({ id, variant = "success", title, onRemove }) => {
  const [visible,  setVisible]  = useState(false);
  const [leaving,  setLeaving]  = useState(false);
  const [progress, setProgress] = useState(100);
  const rafRef     = useRef(null);
  const leavingRef = useRef(false);

  const v = VARIANTS[variant] || VARIANTS.info;
  const { Icon } = v;

  const dismiss = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    cancelAnimationFrame(rafRef.current);
    setTimeout(() => onRemove(id), 320);
  }, [id, onRemove]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(pct);
      if (elapsed < DURATION) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        dismiss();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [dismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        background:   v.bg,
        border:       `1px solid ${v.border}`,
        borderRadius: "14px",
        padding:      "13px 13px 0 13px",
        boxShadow:    "0 6px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)",
        width:        "320px",
        overflow:     "hidden",
        position:     "relative",
        transform:    leaving ? "translateY(120%)" : visible ? "translateY(0)" : "translateY(120%)",
        opacity:      leaving ? 0 : visible ? 1 : 0,
        transition:   "transform 0.32s cubic-bezier(0.34,1.56,0.64,1), opacity 0.28s ease",
        willChange:   "transform, opacity",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingBottom: "12px" }}>

        <span style={{ color: v.iconColor, flexShrink: 0 }}>
          <Icon style={{ width: "17px", height: "17px" }} />
        </span>

        <p style={{
          margin:     0,
          flex:       1,
          fontSize:   "13px",
          fontWeight: 600,
          color:      v.titleColor,
          lineHeight: 1.4,
          wordBreak:  "break-word",
        }}>
          {title}
        </p>

        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            background:     "transparent",
            border:         "none",
            padding:        "2px",
            cursor:         "pointer",
            color:          v.titleColor,
            borderRadius:   "6px",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            flexShrink:     0,
            opacity:        0.5,
            transition:     "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}
        >
          <X style={{ width: "14px", height: "14px" }} />
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "3px", background: "rgba(0,0,0,0.08)" }}>
        <div style={{
          height:       "100%",
          width:        `${progress}%`,
          background:   v.barColor,
          transition:   "width 0.1s linear",
          borderRadius: "0 0 0 14px",
        }} />
      </div>
    </div>
  );
};

// ─── Singleton container ───────────────────────────────────────────────────

let _setToasts = null;
let _idCounter = 0;

const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    _setToasts = setToasts;
    return () => { _setToasts = null; };
  }, []);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div
      aria-label="Notifications"
      style={{
        position:      "fixed",
        bottom:        "24px",
        right:         "24px",
        zIndex:        99999,
        display:       "flex",
        flexDirection: "column",
        gap:           "10px",
        alignItems:    "flex-end",
        pointerEvents: toasts.length ? "auto" : "none",
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} onRemove={remove} />
      ))}
    </div>
  );
};

let _mounted = false;

function ensureMounted() {
  if (_mounted) return;
  _mounted = true;
  const el = document.createElement("div");
  el.id = "__toast_root__";
  document.body.appendChild(el);
  createRoot(el).render(<ToastContainer />);
}

function add(variant, title) {
  ensureMounted();
  const attempt = () => {
    if (_setToasts) {
      const id = ++_idCounter;
      _setToasts((prev) => [...prev, { id, variant, title }]);
    } else {
      setTimeout(attempt, 20);
    }
  };
  attempt();
}

const toast = {
  success: (title) => add("success", title),
  error:   (title) => add("error",   title),
  warning: (title) => add("warning", title),
  info:    (title) => add("info",    title),
};

export default toast;