/**
 * FacePhotoModal.jsx
 *
 * Shown after a successful payment. Asks the pilgrim to take or upload a
 * face photo that will appear on their Umrah ID card.
 *
 * Features:
 *  - Live camera with animated oval guide frame + corner markers
 *  - Real-time face-position hint (too close / move back / good)
 *  - Capture → preview → confirm flow
 *  - File upload fallback with the same oval preview crop
 *  - Uploads to POST /api/passport/face-photo
 *  - "Skip for now" always available — the ID card will read "Photo pending"
 *
 * Props:
 *   pkg        — { id, title }
 *   onDone     — () => void   called after upload OR skip
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Camera, Upload, RefreshCw, CheckCircle2,
  AlertTriangle, Loader2, ArrowRight, User,
} from 'lucide-react';
import { request } from '../api';

const MAX_MB = 8;
const OVAL_W_RATIO = 0.55;   // oval width as fraction of preview width
const OVAL_H_RATIO = 0.78;   // oval height as fraction of preview height

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Crop an ImageBitmap to the oval bounding box, return a blob. */
async function cropToOval(sourceCanvas, previewW, previewH) {
  const ow = previewW * OVAL_W_RATIO;
  const oh = previewH * OVAL_H_RATIO;
  const ox = (previewW - ow) / 2;
  const oy = (previewH - oh) / 2;

  const out = document.createElement('canvas');
  out.width  = Math.round(ow);
  out.height = Math.round(oh);
  const ctx = out.getContext('2d');

  // Clip to oval
  ctx.beginPath();
  ctx.ellipse(out.width / 2, out.height / 2, out.width / 2, out.height / 2, 0, 0, Math.PI * 2);
  ctx.clip();

  // Draw the source region into the oval canvas
  ctx.drawImage(sourceCanvas, ox, oy, ow, oh, 0, 0, out.width, out.height);

  return new Promise((res) => out.toBlob((b) => res(b), 'image/jpeg', 0.92));
}

// ─── OvalGuide overlay ────────────────────────────────────────────────────────
// Pure SVG overlay so it stays crisp at all sizes.
const OvalGuide = ({ hint, capturing }) => (
  <svg
    className="absolute inset-0 w-full h-full pointer-events-none"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
  >
    <defs>
      {/* Punch a hole in the scrim where the oval is */}
      <mask id="ovalMask">
        <rect width="100" height="100" fill="white" />
        <ellipse cx="50" cy="50" rx={OVAL_W_RATIO * 50} ry={OVAL_H_RATIO * 50} fill="black" />
      </mask>
    </defs>

    {/* Dark scrim outside the oval */}
    <rect width="100" height="100" fill="rgba(0,0,0,0.55)" mask="url(#ovalMask)" />

    {/* Animated oval border */}
    <ellipse
      cx="50" cy="50"
      rx={OVAL_W_RATIO * 50 - 0.5}
      ry={OVAL_H_RATIO * 50 - 0.5}
      fill="none"
      stroke={capturing ? '#10b981' : 'rgba(255,255,255,0.85)'}
      strokeWidth="0.8"
      strokeDasharray={capturing ? '0' : '3 2'}
      style={{ transition: 'stroke 0.3s' }}
    />

    {/* Corner tick marks — top-left, top-right, bottom-left, bottom-right */}
    {[
      [50 - OVAL_W_RATIO * 50 + 0.5, 50 - OVAL_H_RATIO * 10],
      [50 + OVAL_W_RATIO * 50 - 0.5, 50 - OVAL_H_RATIO * 10],
      [50 - OVAL_W_RATIO * 50 + 0.5, 50 + OVAL_H_RATIO * 10],
      [50 + OVAL_W_RATIO * 50 - 0.5, 50 + OVAL_H_RATIO * 10],
    ].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r="1.2"
        fill={capturing ? '#10b981' : 'rgba(255,255,255,0.9)'}
        style={{ transition: 'fill 0.3s' }}
      />
    ))}

    {/* Hint text at bottom of oval */}
    {hint && (
      <text
        x="50" y={50 + OVAL_H_RATIO * 50 + 5}
        textAnchor="middle"
        fontSize="4"
        fill={hint === 'Perfect — hold still' ? '#10b981' : '#fbbf24'}
        fontFamily="system-ui, sans-serif"
        fontWeight="600"
      >
        {hint}
      </text>
    )}
  </svg>
);

// ─── FacePhotoModal ───────────────────────────────────────────────────────────
export default function FacePhotoModal({ pkg, onDone }) {
  const [phase, setPhase] = useState('intro'); // intro | camera | preview | uploading | done
  const [photo, setPhoto]     = useState(null);  // { blob, url }
  const [cameraErr, setCameraErr] = useState('');
  const [hint, setHint]       = useState('');
  const [capturing, setCapturing] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const [skipConfirm, setSkipConfirm] = useState(false);

  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);   // offscreen capture canvas
  const streamRef   = useRef(null);
  const detectorRef = useRef(null);   // FaceDetector if available
  const rafRef      = useRef(null);

  // ── camera lifecycle ─────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => { stopCamera(); if (photo?.url) URL.revokeObjectURL(photo.url); }, [stopCamera]); // eslint-disable-line

  // ── face detection hint loop ─────────────────────────────────────────────────
  const runHints = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) { rafRef.current = requestAnimationFrame(runHints); return; }

    // Use FaceDetector API if available (Chrome / Android WebView)
    if (!detectorRef.current && 'FaceDetector' in window) {
      try { detectorRef.current = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 }); } catch { /* not available */ }
    }

    if (detectorRef.current) {
      try {
        const faces = await detectorRef.current.detect(video);
        if (faces.length === 0) {
          setHint('No face detected — look at the camera');
        } else {
          const { width: vw, height: vh } = video.getBoundingClientRect();
          const { x, y, width: fw, height: fh } = faces[0].boundingBox;
          const faceCenterX = x + fw / 2;
          const faceCenterY = y + fh / 2;
          const ovalCX = vw / 2, ovalCY = vh / 2;
          const offH = Math.abs(faceCenterX - ovalCX) / vw;
          const offV = Math.abs(faceCenterY - ovalCY) / vh;
          const faceRatio = fw / vw;

          if (faceRatio < 0.25) setHint('Move closer');
          else if (faceRatio > 0.65) setHint('Move back');
          else if (offH > 0.12 || offV > 0.12) setHint('Centre your face in the oval');
          else setHint('Perfect — hold still');
        }
      } catch { setHint(''); }
    }

    rafRef.current = requestAnimationFrame(runHints);
  }, []);

  const startCamera = async () => {
    setCameraErr('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      setPhase('camera');
      // small delay so the video element has mounted
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
          rafRef.current = requestAnimationFrame(runHints);
        }
      }, 80);
    } catch {
      setCameraErr('Camera unavailable. Please allow camera access or upload a photo instead.');
    }
  };

  // ── capture ──────────────────────────────────────────────────────────────────
  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video) return;
    setCapturing(true);

    // Brief flash feedback
    setTimeout(async () => {
      const c = document.createElement('canvas');
      c.width = video.videoWidth;
      c.height = video.videoHeight;
      c.getContext('2d').drawImage(video, 0, 0);

      // Crop to the oval region
      const blob = await cropToOval(c, c.width, c.height);
      const url  = URL.createObjectURL(blob);
      stopCamera();
      if (photo?.url) URL.revokeObjectURL(photo.url);
      setPhoto({ blob, url });
      setCapturing(false);
      setPhase('preview');
    }, 150);
  };

  // ── file upload ───────────────────────────────────────────────────────────────
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setCameraErr('Please choose a JPEG, PNG or WebP image.'); return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setCameraErr(`Image too large (max ${MAX_MB} MB).`); return;
    }
    setCameraErr('');

    // Draw into an offscreen canvas and crop to oval
    const bmp = await createImageBitmap(file);
    const c = document.createElement('canvas');
    c.width = bmp.width; c.height = bmp.height;
    c.getContext('2d').drawImage(bmp, 0, 0);
    const blob = await cropToOval(c, c.width, c.height);
    const url  = URL.createObjectURL(blob);
    if (photo?.url) URL.revokeObjectURL(photo.url);
    setPhoto({ blob, url });
    setPhase('preview');
  };

  // ── submit ───────────────────────────────────────────────────────────────────
  const submitPhoto = async () => {
    if (!photo?.blob) return;
    setPhase('uploading');
    setUploadErr('');
    try {
      const fd = new FormData();
      fd.append('face', photo.blob, 'face.jpg');
      fd.append('packageId', pkg.id);
      await request({ method: 'post', url: '/passport/face-photo', data: fd });
      setPhase('done');
    } catch (err) {
      setUploadErr(err.response?.data?.error || err.message || 'Upload failed. Please try again.');
      setPhase('preview');
    }
  };

  const retake = () => {
    if (photo?.url) URL.revokeObjectURL(photo.url);
    setPhoto(null);
    setCameraErr('');
    setPhase('intro');
  };

  // ── body scroll lock ─────────────────────────────────────────────────────────
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">

        {/* ── header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-50">
              <Camera className="h-5 w-5 text-emerald-600" />
            </span>
            <div className="leading-tight">
              <p className="font-bold text-gray-900 text-sm">Add your ID photo</p>
              <p className="text-[11px] text-gray-400">Appears on your Umrah ID card</p>
            </div>
          </div>
          {phase !== 'uploading' && (
            <button
              onClick={() => setSkipConfirm(true)}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Skip
            </button>
          )}
        </div>

        {/* ── body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ══ INTRO ══ */}
          {phase === 'intro' && (
            <div className="p-5 space-y-5">
              {/* Illustration */}
              <div className="mx-auto relative w-36 h-44 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(160deg, #ecfdf5 0%, #d1fae5 100%)' }} />
                <svg viewBox="0 0 100 120" className="relative w-full h-full" fill="none">
                  {/* Oval guide */}
                  <ellipse cx="50" cy="52" rx="28" ry="36" stroke="#059669" strokeWidth="1.5" strokeDasharray="4 3" fill="rgba(209,250,229,0.4)" />
                  {/* Simplified face */}
                  <circle cx="50" cy="40" r="12" fill="#a7f3d0" />
                  <ellipse cx="50" cy="65" rx="16" ry="10" fill="#a7f3d0" />
                  {/* Eyes */}
                  <circle cx="45" cy="39" r="2" fill="#059669" />
                  <circle cx="55" cy="39" r="2" fill="#059669" />
                  {/* Smile */}
                  <path d="M45 44 Q50 48 55 44" stroke="#059669" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                  {/* Corner ticks */}
                  <circle cx="22" cy="30" r="1.5" fill="#059669" />
                  <circle cx="78" cy="30" r="1.5" fill="#059669" />
                  <circle cx="22" cy="74" r="1.5" fill="#059669" />
                  <circle cx="78" cy="74" r="1.5" fill="#059669" />
                </svg>
              </div>

              <div className="text-center space-y-1.5 px-2">
                <h3 className="font-bold text-gray-900">Position your face in the oval</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Your photo will be used for your pilgrim ID card. Look straight at the camera, keep your face centred in the guide frame.
                </p>
              </div>

              <div className="space-y-2">
                {[
                  ['Good lighting', 'Face well-lit, no harsh shadows'],
                  ['Plain background', 'Plain wall or neutral backdrop'],
                  ['No glasses', 'Remove sunglasses — clear face preferred'],
                ].map(([title, desc]) => (
                  <div key={title} className="flex items-start gap-2.5 bg-gray-50 rounded-xl px-3 py-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{title}</p>
                      <p className="text-[11px] text-gray-400">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {cameraErr && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />{cameraErr}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={startCamera}
                  className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl font-semibold text-white text-sm shadow-md transition-all hover:brightness-110 active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#059669,#0d9488)' }}
                >
                  <Camera className="h-6 w-6" />
                  Take photo
                </button>
                <label className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl border-2 border-dashed border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors cursor-pointer text-sm font-semibold text-gray-600">
                  <Upload className="h-6 w-6 text-emerald-600" />
                  Upload photo
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
                </label>
              </div>
            </div>
          )}

          {/* ══ CAMERA ══ */}
          {phase === 'camera' && (
            <div className="relative bg-black" style={{ aspectRatio: '3/4' }}>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />

              {/* Oval guide overlay */}
              <OvalGuide hint={hint} capturing={capturing} />

              {/* Flash on capture */}
              {capturing && (
                <div className="absolute inset-0 bg-white animate-ping opacity-30 pointer-events-none" />
              )}

              {/* Controls overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between">
                {/* Cancel */}
                <button
                  onClick={() => { stopCamera(); setPhase('intro'); }}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Shutter */}
                <button
                  onClick={capturePhoto}
                  disabled={capturing}
                  className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center transition-all active:scale-90 disabled:opacity-60"
                  style={{ background: capturing ? '#10b981' : 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }}
                >
                  {capturing
                    ? <CheckCircle2 className="h-7 w-7 text-white" />
                    : <div className="w-10 h-10 rounded-full bg-white" />}
                </button>

                {/* Upload from gallery as alternative */}
                <label className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60 transition-colors cursor-pointer">
                  <Upload className="h-5 w-5" />
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
                </label>
              </div>
            </div>
          )}

          {/* ══ PREVIEW ══ */}
          {phase === 'preview' && photo && (
            <div className="p-5 space-y-4">
              {uploadErr && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />{uploadErr}
                </div>
              )}

              {/* Oval-cropped preview */}
              <div className="mx-auto relative" style={{ width: '160px', height: '190px' }}>
                {/* Oval clip */}
                <div
                  className="w-full h-full overflow-hidden"
                  style={{
                    borderRadius: '50%',
                    border: '3px solid #059669',
                    boxShadow: '0 0 0 4px rgba(5,150,105,0.12)',
                  }}
                >
                  <img
                    src={photo.url}
                    alt="Your face photo"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800">Looks good?</p>
                <p className="text-xs text-gray-400 mt-0.5">This is how you'll appear on your Umrah ID card</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={retake}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" /> Retake
                </button>
                <button
                  onClick={submitPhoto}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm shadow-md hover:brightness-110 transition-all"
                  style={{ background: 'linear-gradient(135deg,#059669,#0d9488)' }}
                >
                  <CheckCircle2 className="h-4 w-4" /> Use this photo
                </button>
              </div>
            </div>
          )}

          {/* ══ UPLOADING ══ */}
          {phase === 'uploading' && (
            <div className="py-16 flex flex-col items-center gap-4 text-center px-6">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
                <div className="absolute inset-0 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
                <div className="absolute inset-3 rounded-full bg-emerald-50 flex items-center justify-center">
                  <Camera className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <div>
                <p className="font-bold text-gray-900">Saving your photo…</p>
                <p className="text-sm text-gray-400 mt-1">Just a moment</p>
              </div>
            </div>
          )}

          {/* ══ DONE ══ */}
          {phase === 'done' && (
            <div className="p-6 flex flex-col items-center gap-4 text-center">
              {photo && (
                <div
                  className="w-24 h-28 overflow-hidden mx-auto"
                  style={{
                    borderRadius: '50%',
                    border: '3px solid #10b981',
                    boxShadow: '0 0 0 6px rgba(16,185,129,0.1)',
                  }}
                >
                  <img src={photo.url} alt="" className="w-full h-full object-cover object-top" />
                </div>
              )}
              <div>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <p className="font-bold text-gray-900">Photo saved!</p>
                </div>
                <p className="text-sm text-gray-500">Your Umrah ID card is ready. Your agent can now print or share it.</p>
              </div>
              <button
                onClick={onDone}
                className="w-full py-3.5 rounded-2xl font-bold text-white shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#059669,#0d9488)' }}
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Skip confirm ── */}
      {skipConfirm && (
        <div className="absolute inset-0 bg-black/60 flex items-end justify-center p-4 z-10">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-50 flex-shrink-0">
                <User className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Skip photo for now?</p>
                <p className="text-sm text-gray-500 mt-1">Your ID card will show "Photo pending" until you add one. You can add it later from your bookings.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSkipConfirm(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                Go back
              </button>
              <button
                onClick={onDone}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(135deg,#d97706,#b45309)' }}
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}