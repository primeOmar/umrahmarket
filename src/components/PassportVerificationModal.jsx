import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, ShieldCheck, AlertCircle, AlertTriangle, CheckCircle2, Loader2,
  Camera, Upload, RefreshCw, ChevronLeft, FileWarning, ArrowRight,
} from 'lucide-react';
import { checkPassport, verifyPassportImage } from '../api';
import {
  checkExpiryAgainstPackage, expiryReasonMessage, getTravelDate, fmtDate,
  MATCH_FIELD_LABELS, MIN_VALIDITY_MONTHS,
} from '../utils/passport';

const inputCls = (err) =>
  `w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors text-gray-900 ${
    err ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-emerald-500'
  }`;

const Field = ({ label, error, hint, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    {children}
    {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    {error && (
      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />{error}
      </p>
    )}
  </div>
);

const greenBtn = 'w-full py-3.5 rounded-2xl font-bold text-white text-base transition-all disabled:opacity-60 flex items-center justify-center gap-2';
const greenStyle = { background: 'linear-gradient(135deg,#059669,#0d9488)' };

const MAX_MB = 8;

export default function PassportVerificationModal({
  pkg,
  user,
  travelerIndex = 0,
  travelerLabel,
  initialState,
  onProgressChange,
  onClose,
  onVerified,
}) {
  const emptyForm = {
    surname: '', givenNames: '', passportNumber: '',
    nationality: '', dateOfBirth: '', passportExpiry: '',
  };
  const [step, setStep] = useState(initialState?.step || 'details'); // details | renew | capture | scanning | mismatch | review | success
  const [form, setForm] = useState(initialState?.form || emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [renewMsg, setRenewMsg] = useState(initialState?.renewMsg || '');

  // capture state
  const [photo, setPhoto] = useState(null);        // { file, url }
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraErr, setCameraErr] = useState(initialState?.cameraErr || '');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // verification result
  const [result, setResult] = useState(initialState?.result || null);
  const [serverErr, setServerErr] = useState(initialState?.serverErr || '');
  const [autoAdvancing, setAutoAdvancing] = useState(false);

  const travelDate = getTravelDate(pkg);
  const lastProgressRef = useRef(null);

  const progressSnapshot = useCallback(() => ({
    step,
    form,
    errors,
    renewMsg,
    cameraErr,
    serverErr,
    result,
    travelerIndex,
    travelerLabel,
  }), [cameraErr, errors, form, renewMsg, result, serverErr, step, travelerIndex, travelerLabel]);

  useEffect(() => {
    if (!onProgressChange) return;
    const snapshot = progressSnapshot();
    const prev = lastProgressRef.current;
    const same = prev && JSON.stringify(prev) === JSON.stringify(snapshot);
    if (same) return;
    lastProgressRef.current = snapshot;
    onProgressChange(snapshot);
  }, [onProgressChange, progressSnapshot]);

  useEffect(() => {
    lastProgressRef.current = null;
  }, [travelerIndex]);

  useEffect(() => {
    if (!['review', 'success'].includes(step)) {
      setAutoAdvancing(false);
    }
  }, [step]);

  // ── lock body scroll ──────────────────────────────────────────────────────
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ── camera lifecycle ────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]); // stop on unmount

  const startCamera = async () => {
    setCameraErr('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
      // attach after render
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); } }, 50);
    } catch {
      setCameraErr('Camera unavailable. Please allow camera access or upload a photo instead.');
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'passport-capture.jpg', { type: 'image/jpeg' });
      if (photo?.url) URL.revokeObjectURL(photo.url);
      setPhoto({ file, url: URL.createObjectURL(blob) });
      stopCamera();
    }, 'image/jpeg', 0.92);
  };

  const onFile = (e) => {
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
    if (photo?.url) URL.revokeObjectURL(photo.url);
    setPhoto({ file, url: URL.createObjectURL(file) });
  };

  const clearPhoto = () => {
    if (photo?.url) URL.revokeObjectURL(photo.url);
    setPhoto(null);
  };

  // ── step 1: validate details ────────────────────────────────────────────────
  const validateDetails = () => {
    const e = {};
    if (!form.surname.trim()) e.surname = 'Surname is required';
    if (!form.givenNames.trim()) e.givenNames = 'Given names are required';
    if (!/^[A-Za-z0-9]{4,20}$/.test(form.passportNumber.trim())) e.passportNumber = 'Enter a valid passport number';
    if (form.nationality && !/^[A-Za-z]{3}$/.test(form.nationality.trim())) e.nationality = 'Use a 3-letter code (e.g. KEN)';
    if (!form.passportExpiry) e.passportExpiry = 'Expiry date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submitDetails = async () => {
    if (!validateDetails()) return;

    // Instant client-side 6-month rule.
    const local = checkExpiryAgainstPackage(pkg, form.passportExpiry);
    if (!local.valid) { setRenewMsg(expiryReasonMessage(local.reason)); setStep('renew'); return; }

    setSubmitting(true);
    setServerErr('');
    try {
      const res = await checkPassport({
        packageId: pkg.id,
        passportExpiry: form.passportExpiry,
        travelerIndex,
      });
      if (!res.valid) { setRenewMsg(res.message || expiryReasonMessage(res.reason)); setStep('renew'); return; }
      setStep('capture');
    } catch (err) {
      setServerErr(err.message || 'Could not validate passport. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── step 2: upload + OCR ──────────────────────────────────────────────────
  const submitPhoto = async () => {
    if (!photo?.file) { setCameraErr('Please take or upload a photo of your passport.'); return; }
    setStep('scanning');
    setServerErr('');
    try {
      const nationality = form.nationality ? form.nationality.trim().toUpperCase() : '';
      const res = await verifyPassportImage(
        {
          packageId: pkg.id,
          travelerIndex,
          passportNumber: form.passportNumber.trim().toUpperCase(),
          passportExpiry: form.passportExpiry,
          surname: form.surname.trim(),
          givenNames: form.givenNames.trim(),
          dateOfBirth: form.dateOfBirth || '',
          nationality,
          passportCountry: nationality,
        },
        photo.file,
      );
      setResult(res);

      if (res.status === 'rejected') { setRenewMsg(res.message); setStep('renew'); }
      else if (res.verified) setStep('success');
      else if (res.status === 'manual_review' || res.canProceed) setStep('review');
      else setStep('mismatch');
    } catch (err) {
      const serverError = err.response?.data?.error;
      const status = err.response?.status;
      const ref = err.response?.data?.ref;
      setServerErr(
        status === 500
          ? `Server error (${status}). Please try again.${ref ? ` Reference: ${ref}` : ''}`
          : serverError || err.message || 'Verification failed. Please try again.'
      );
      setStep('capture');
    }
  };

  const proceedToPayment = useCallback(() => {
    console.info('[passport-handoff]', {
      action: 'modal-proceed',
      travelerIndex,
      travelerLabel,
      step,
      result,
      hasOnVerified: typeof onVerified === 'function',
    });
    stopCamera();
    setAutoAdvancing(true);
    window.setTimeout(() => {
      console.info('[passport-handoff]', {
        action: 'modal-onverified-trigger',
        travelerIndex,
        travelerLabel,
        step,
      });
      onVerified?.(result, travelerIndex);
    }, 900);
  }, [onVerified, result, step, stopCamera, travelerIndex, travelerLabel]);

  useEffect(() => {
    if (!['review', 'success'].includes(step)) return;
    console.info('[passport-handoff]', {
      action: 'auto-advance-arm',
      step,
      travelerIndex,
      travelerLabel,
      autoAdvancing,
    });
    const timer = window.setTimeout(() => {
      if (!autoAdvancing) {
        console.info('[passport-handoff]', { action: 'auto-advance-trigger', step, travelerIndex, travelerLabel });
        proceedToPayment();
      }
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [autoAdvancing, proceedToPayment, step, travelerIndex, travelerLabel]);

  // ── shell ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) { stopCamera(); onClose(); } }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50"><ShieldCheck className="h-5 w-5 text-emerald-600" /></span>
            <div>
              <p className="font-bold text-gray-900 leading-tight">Verify your passport</p>
              <p className="text-xs text-gray-500">
                {travelerLabel
                  ? `${travelerLabel} · Step 1 of 3 · Required before payment`
                  : 'Step 1 of 3 · Required before payment'}
              </p>
            </div>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }} className="p-2 hover:bg-gray-100 rounded-xl transition-colors" aria-label="Close">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* package + travel date banner */}
          <div className="mb-4 flex items-center gap-3 bg-gray-50 rounded-xl p-3">
            {pkg.image && <img src={pkg.image} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />}
            <div className="min-w-0">
              <p className="font-semibold text-sm text-gray-900 truncate">{pkg.title}</p>
              <p className="text-xs text-gray-500">Travel from <strong>{fmtDate(travelDate)}</strong> · passport must be valid {MIN_VALIDITY_MONTHS}+ months after</p>
            </div>
          </div>

          {serverErr && (
            <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />{serverErr}
            </div>
          )}

          {/* ── STEP: details ── */}
          {step === 'details' && (
            <div className="space-y-3.5">
              <Field label="Surname (as in passport)" error={errors.surname}>
                <input className={inputCls(errors.surname)} value={form.surname}
                  onChange={(e) => setForm({ ...form, surname: e.target.value })} placeholder="e.g. OMAR" />
              </Field>
              <Field label="Given names" error={errors.givenNames}>
                <input className={inputCls(errors.givenNames)} value={form.givenNames}
                  onChange={(e) => setForm({ ...form, givenNames: e.target.value })} placeholder="e.g. AISHA FATIMA" />
              </Field>
              <Field label="Passport number" error={errors.passportNumber}>
                <input className={inputCls(errors.passportNumber)} value={form.passportNumber}
                  onChange={(e) => setForm({ ...form, passportNumber: e.target.value.toUpperCase() })} placeholder="e.g. A1234567" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nationality" error={errors.nationality} hint="3-letter code (optional)">
                  <input className={inputCls(errors.nationality)} maxLength={3} value={form.nationality}
                    onChange={(e) => setForm({ ...form, nationality: e.target.value.toUpperCase() })} placeholder="KEN" />
                </Field>
                <Field label="Date of birth" hint="optional">
                  <input type="date" className={inputCls(false)} value={form.dateOfBirth}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
                </Field>
              </div>
              <Field label="Passport expiry date" error={errors.passportExpiry}>
                <input type="date" className={inputCls(errors.passportExpiry)} value={form.passportExpiry}
                  onChange={(e) => setForm({ ...form, passportExpiry: e.target.value })} />
              </Field>

              <button className={greenBtn} style={greenStyle} disabled={submitting} onClick={submitDetails}>
                {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Checking…</> : <>Continue <ArrowRight className="h-4 w-4" /></>}
              </button>
              <p className="text-[11px] text-gray-400 text-center">Your details are encrypted and used only to verify your passport.</p>
            </div>
          )}

          {/* ── STEP: renew (invalid passport) ── */}
          {step === 'renew' && (
            <div className="text-center py-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <FileWarning className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Passport needs renewal</h3>
              <p className="text-sm text-gray-600 mb-6 px-2">{renewMsg}</p>
              <button className="w-full py-3.5 rounded-2xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                onClick={() => { stopCamera(); onClose(); }}>
                Close
              </button>
            </div>
          )}

          {/* ── STEP: capture ── */}
          {step === 'capture' && (
            <div className="space-y-4">
              <button className="text-sm text-gray-500 flex items-center gap-1 hover:text-gray-700" onClick={() => setStep('details')}>
                <ChevronLeft className="h-4 w-4" /> Back to details
              </button>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-800">
                Place the <strong>data page</strong> flat in good light. Fill the frame. We read the two machine-readable lines at the bottom.
              </div>

              {cameraErr && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-3 text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />{cameraErr}
                </div>
              )}

              {/* camera live view */}
              {cameraOn && (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-[3/2]">
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                    {/* Passport document frame guide overlay */}
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      viewBox="0 0 100 67"
                      preserveAspectRatio="none"
                    >
                      {/* Dark scrim outside the guide rect */}
                      <defs>
                        <mask id="docMask">
                          <rect width="100" height="67" fill="white" />
                          <rect x="8" y="8" width="84" height="51" rx="2" fill="black" />
                        </mask>
                      </defs>
                      <rect width="100" height="67" fill="rgba(0,0,0,0.5)" mask="url(#docMask)" />
                      {/* Guide rect border */}
                      <rect x="8" y="8" width="84" height="51" rx="2"
                        fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.6" strokeDasharray="3 2" />
                      {/* Corner ticks */}
                      {[
                        [8, 8], [92, 8], [8, 59], [92, 59]
                      ].map(([x, y], i) => (
                        <circle key={i} cx={x} cy={y} r="1.5" fill="rgba(255,255,255,0.9)" />
                      ))}
                      {/* MRZ zone indicator */}
                      <rect x="8" y="50" width="84" height="9" rx="0"
                        fill="rgba(16,185,129,0.18)" />
                      <text x="50" y="56" textAnchor="middle" fontSize="3.5"
                        fill="rgba(255,255,255,0.7)" fontFamily="system-ui,sans-serif">
                        Machine-readable zone
                      </text>
                    </svg>
                  </div>
                  <div className="flex gap-3">
                    <button className="flex-1 py-3 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200" onClick={stopCamera}>Cancel</button>
                    <button className={`${greenBtn} flex-1`} style={greenStyle} onClick={capturePhoto}><Camera className="h-5 w-5" /> Capture</button>
                  </div>
                </div>
              )}

              {/* preview */}
              {!cameraOn && photo && (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden border-2 border-emerald-200">
                    <img src={photo.url} alt="Passport preview" className="w-full object-contain max-h-64 bg-gray-50" />
                  </div>
                  <div className="flex gap-3">
                    <button className="flex-1 py-3 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 flex items-center justify-center gap-2" onClick={clearPhoto}>
                      <RefreshCw className="h-4 w-4" /> Retake
                    </button>
                    <button className={`${greenBtn} flex-1`} style={greenStyle} onClick={submitPhoto}>
                      <ShieldCheck className="h-5 w-5" /> Scan & verify
                    </button>
                  </div>
                </div>
              )}

              {/* choose source */}
              {!cameraOn && !photo && (
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={startCamera}
                    className="flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors">
                    <Camera className="h-7 w-7 text-emerald-600" />
                    <span className="text-sm font-semibold text-gray-700">Take photo</span>
                  </button>
                  <label className="flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors cursor-pointer">
                    <Upload className="h-7 w-7 text-emerald-600" />
                    <span className="text-sm font-semibold text-gray-700">Upload photo</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* ── STEP: scanning ── */}
          {step === 'scanning' && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 text-emerald-600 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-1">Scanning passport for {travelerLabel || 'this traveler'}…</h3>
              <p className="text-sm text-gray-500">Reading the document and matching your details. This can take a few seconds.</p>
            </div>
          )}

          {/* ── STEP: mismatch (retry) ── */}
          {step === 'mismatch' && result && (
            <div className="space-y-4">
              <div className="text-center pt-2">
                <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                  <AlertTriangle className="h-8 w-8 text-amber-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Couldn’t confirm your passport</h3>
                <p className="text-sm text-gray-600 mt-1">{result.message}</p>
              </div>

              {result.match?.fields && (
                <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {Object.entries(result.match.fields).map(([k, ok]) => (
                    <div key={k} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="text-gray-600">{MATCH_FIELD_LABELS[k] || k}</span>
                      {ok
                        ? <span className="flex items-center gap-1 text-emerald-600 font-medium"><CheckCircle2 className="h-4 w-4" /> Match</span>
                        : <span className="flex items-center gap-1 text-red-500 font-medium"><X className="h-4 w-4" /> No match</span>}
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-center text-gray-500">
                {result.attemptsRemaining > 0
                  ? `${result.attemptsRemaining} attempt${result.attemptsRemaining === 1 ? '' : 's'} remaining before manual review.`
                  : 'No attempts remaining.'}
              </p>

              <div className="flex gap-3">
                <button className="flex-1 py-3 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200" onClick={() => setStep('details')}>Edit details</button>
                <button className={`${greenBtn} flex-1`} style={greenStyle} onClick={() => { clearPhoto(); setStep('capture'); }}>
                  <RefreshCw className="h-5 w-5" /> Retake photo
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: manual review (proceed allowed) ── */}
          {step === 'review' && (
            <div className="text-center py-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <ShieldCheck className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">We’ll verify this manually</h3>
              <p className="text-sm text-gray-600 mb-6 px-2">{result?.message || 'Your booking can continue. Our team will verify your passport before travel.'}</p>
              {autoAdvancing ? (
                <div className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700">
                  <Loader2 className="h-4 w-4 animate-spin" /> Continuing to the next traveler…
                </div>
              ) : (
                <button className={greenBtn} style={greenStyle} onClick={proceedToPayment}>Continue to payment <ArrowRight className="h-4 w-4" /></button>
              )}
            </div>
          )}

          {/* ── STEP: success ── */}
          {step === 'success' && (
            <div className="text-center py-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-9 w-9 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Passport verified</h3>
              <p className="text-sm text-gray-600 mb-6 px-2">Your passport details were confirmed. You can now proceed to payment.</p>
              {autoAdvancing ? (
                <div className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700">
                  <Loader2 className="h-4 w-4 animate-spin" /> Continuing to the next traveler…
                </div>
              ) : (
                <button className={greenBtn} style={greenStyle} onClick={proceedToPayment}>Continue to payment <ArrowRight className="h-4 w-4" /></button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}