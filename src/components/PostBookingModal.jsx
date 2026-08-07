// PostBookingModal.jsx
// Shown right after a successful payment (and re-shown on later logins until
// complete) to collect the three things a booking cannot be considered
// travel-ready without:
//   1. Contact details — email + mobile number       (profiles table)
//   2. Next-of-kin      — name + mobile number         (next_of_kin table)
//   3. Umrah ID photo   — a plain-background, forward-facing photo the
//                         client uploads or takes directly. This is NOT
//                         passport document verification/OCR — that's a
//                         separate, pre-existing flow elsewhere in the app.
//                         This step calls POST /api/passport/face-photo,
//                         which just stores the photo as-is (no cropping,
//                         no scanning) for the Umrah ID card.
//
// Props:
//   booking   — { id, package_id, package: { name, available_from, ... } }
//   user      — current user object (used to prefill email if known)
//   onClose() — called when the client dismisses the modal. The dashboard's
//               "missing details" nudge will bring it back next time any
//               step is still incomplete — dismissing is not a hard block.
//   onComplete() — called once all three steps are confirmed complete
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  X, Mail, Phone, Users, Camera, Upload, CheckCircle, AlertCircle,
  Loader2, ChevronRight, ChevronLeft, ShieldCheck, User as UserIcon,
} from 'lucide-react';
import { request } from '../api';

const STEPS = ['contact', 'nextOfKin', 'idPhoto'];
const STEP_LABELS = { contact: 'Contact Details', nextOfKin: 'Next of Kin', idPhoto: 'Umrah ID Photo' };

const RELATIONSHIP_OPTIONS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Relative', 'Guardian', 'Friend', 'Other'];

// Dial codes for the next-of-kin phone selector. Kenya is listed first (and
// used as the default) since it's the primary market, but the client is
// free to pick any country — nothing here assumes a Kenyan contact.
const COUNTRY_CODES = [
  { dial: '+254', name: 'Kenya' },
  { dial: '+255', name: 'Tanzania' },
  { dial: '+256', name: 'Uganda' },
  { dial: '+250', name: 'Rwanda' },
  { dial: '+257', name: 'Burundi' },
  { dial: '+251', name: 'Ethiopia' },
  { dial: '+252', name: 'Somalia' },
  { dial: '+211', name: 'South Sudan' },
  { dial: '+249', name: 'Sudan' },
  { dial: '+20', name: 'Egypt' },
  { dial: '+212', name: 'Morocco' },
  { dial: '+213', name: 'Algeria' },
  { dial: '+216', name: 'Tunisia' },
  { dial: '+218', name: 'Libya' },
  { dial: '+234', name: 'Nigeria' },
  { dial: '+233', name: 'Ghana' },
  { dial: '+27', name: 'South Africa' },
  { dial: '+260', name: 'Zambia' },
  { dial: '+263', name: 'Zimbabwe' },
  { dial: '+265', name: 'Malawi' },
  { dial: '+258', name: 'Mozambique' },
  { dial: '+966', name: 'Saudi Arabia' },
  { dial: '+971', name: 'United Arab Emirates' },
  { dial: '+974', name: 'Qatar' },
  { dial: '+965', name: 'Kuwait' },
  { dial: '+973', name: 'Bahrain' },
  { dial: '+968', name: 'Oman' },
  { dial: '+962', name: 'Jordan' },
  { dial: '+961', name: 'Lebanon' },
  { dial: '+90', name: 'Turkey' },
  { dial: '+92', name: 'Pakistan' },
  { dial: '+91', name: 'India' },
  { dial: '+880', name: 'Bangladesh' },
  { dial: '+94', name: 'Sri Lanka' },
  { dial: '+60', name: 'Malaysia' },
  { dial: '+62', name: 'Indonesia' },
  { dial: '+63', name: 'Philippines' },
  { dial: '+86', name: 'China' },
  { dial: '+852', name: 'Hong Kong' },
  { dial: '+81', name: 'Japan' },
  { dial: '+82', name: 'South Korea' },
  { dial: '+44', name: 'United Kingdom' },
  { dial: '+353', name: 'Ireland' },
  { dial: '+33', name: 'France' },
  { dial: '+49', name: 'Germany' },
  { dial: '+31', name: 'Netherlands' },
  { dial: '+34', name: 'Spain' },
  { dial: '+39', name: 'Italy' },
  { dial: '+41', name: 'Switzerland' },
  { dial: '+46', name: 'Sweden' },
  { dial: '+47', name: 'Norway' },
  { dial: '+45', name: 'Denmark' },
  { dial: '+1', name: 'United States / Canada' },
  { dial: '+52', name: 'Mexico' },
  { dial: '+55', name: 'Brazil' },
  { dial: '+61', name: 'Australia' },
  { dial: '+64', name: 'New Zealand' },
];

// Sort dial codes longest-first so a prefix match (e.g. "+254" before "+1")
// picks the most specific country when re-splitting a saved E.164 number.
const COUNTRY_CODES_BY_LENGTH = [...COUNTRY_CODES].sort((a, b) => b.dial.length - a.dial.length);

function splitPhone(fullPhone) {
  if (!fullPhone) return { dial: '+254', local: '' };
  const match = COUNTRY_CODES_BY_LENGTH.find((c) => fullPhone.startsWith(c.dial));
  if (match) return { dial: match.dial, local: fullPhone.slice(match.dial.length) };
  return { dial: '+254', local: fullPhone.replace(/^\+/, '') };
}

function getBookingTravelerCount(booking = {}) {
  const direct = Number(
    booking?.total_travelers ??
    booking?.totalTravelers ??
    booking?.traveler_count ??
    booking?.travelerCount ??
    booking?.passenger_count ??
    booking?.passengerCount
  );
  if (Number.isFinite(direct) && direct > 0) return direct;

  const fromArray = [
    booking?.traveler_details,
    booking?.travelerDetails,
    booking?.travelers,
    booking?.travellers,
    booking?.passengers,
    booking?.clients,
    booking?.passport_verifications,
    booking?.passportVerifications,
  ].find((v) => Array.isArray(v));

  return Array.isArray(fromArray) && fromArray.length > 0 ? fromArray.length : 1;
}

function getBookingTravelers(booking = {}) {
  const list = [
    booking?.traveler_details,
    booking?.travelerDetails,
    booking?.travelers,
    booking?.travellers,
    booking?.passengers,
    booking?.clients,
    booking?.passport_verifications,
    booking?.passportVerifications,
  ].find((v) => Array.isArray(v));

  const total = getBookingTravelerCount(booking);
  const out = Array.from({ length: total }).map((_, idx) => ({
    index: idx,
    label: `Traveler ${idx + 1}`,
    name: `Traveler ${idx + 1}`,
  }));

  if (!Array.isArray(list)) return out;

  list.forEach((row, idx) => {
    const travelerIndex = Number(row?.traveler_index ?? row?.travelerIndex ?? idx);
    if (!Number.isFinite(travelerIndex) || travelerIndex < 0 || travelerIndex >= out.length) return;
    const given = row?.given_names ?? row?.givenNames ?? row?.first_name ?? row?.firstName ?? '';
    const surname = row?.surname ?? row?.last_name ?? row?.lastName ?? '';
    const fullName = row?.full_name ?? row?.fullName ?? row?.name ?? `${given} ${surname}`.trim();
    out[travelerIndex] = {
      ...out[travelerIndex],
      name: fullName || out[travelerIndex].name,
    };
  });

  return out;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FieldError = ({ children }) =>
  children ? (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
      <AlertCircle className="h-3 w-3 flex-shrink-0" /> {children}
    </p>
  ) : null;

const TextInput = ({ icon: Icon, error, ...props }) => (
  <div>
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors ${
      error ? 'border-red-400 bg-red-50' : 'border-gray-300 focus-within:border-emerald-500 bg-white'
    }`}>
      {Icon && <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />}
      <input
        {...props}
        className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
      />
    </div>
    <FieldError>{error}</FieldError>
  </div>
);

const SelectInput = ({ icon: Icon, error, children, ...props }) => (
  <div>
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors ${
      error ? 'border-red-400 bg-red-50' : 'border-gray-300 focus-within:border-emerald-500 bg-white'
    }`}>
      {Icon && <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />}
      <select
        {...props}
        className="w-full bg-transparent text-sm text-gray-900 outline-none appearance-none"
      >
        {children}
      </select>
    </div>
    <FieldError>{error}</FieldError>
  </div>
);

const StepDots = ({ current, completed }) => (
  <div className="flex items-center justify-center gap-2 mb-5">
    {STEPS.map((s, i) => (
      <div key={s} className="flex items-center">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
            completed[s]
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : current === s
                ? 'border-emerald-500 text-emerald-600'
                : 'border-gray-300 text-gray-400'
          }`}
        >
          {completed[s] ? <CheckCircle className="h-4 w-4" /> : i + 1}
        </div>
        {i < STEPS.length - 1 && (
          <div className={`w-8 h-0.5 mx-1 ${completed[s] ? 'bg-emerald-500' : 'bg-gray-200'}`} />
        )}
      </div>
    ))}
  </div>
);

const PostBookingModal = ({ booking, user, onClose, onComplete }) => {
  const pkg = booking?.package ?? {};
  const packageId = booking?.package_id ?? pkg?.id;
  const packageName = pkg?.name ?? 'your package';
  const bookingTravelers = useMemo(() => getBookingTravelers(booking), [booking]);
  const travelerTotal = Math.max(1, bookingTravelers.length);

  const [step, setStep] = useState('contact');
  const [completed, setCompleted] = useState({ contact: false, nextOfKin: false, idPhoto: false });
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [error, setError] = useState('');

  // ── Step 1: contact ────────────────────────────────────────────────────
  const [contact, setContact] = useState(() => {
    const { local } = splitPhone(user?.phone || '');
    return { email: user?.email || '', phone: user?.phone ? local : '' };
  });
  const [contactCountryCode, setContactCountryCode] = useState(() => splitPhone(user?.phone || '').dial);
  const [contactErrors, setContactErrors] = useState({});
  const [savingContact, setSavingContact] = useState(false);

  // ── Step 2: next of kin ────────────────────────────────────────────────
  const [kin, setKin] = useState({ fullName: '', relationship: '', phone: '', email: '' });
  const [kinCountryCode, setKinCountryCode] = useState('+254');
  const [relationshipOther, setRelationshipOther] = useState('');
  const [kinErrors, setKinErrors] = useState({});
  const [savingKin, setSavingKin] = useState(false);

  // ── Step 3: Umrah ID photo (no OCR — but every source is run through a
  // face-framing crop below so what gets submitted is always a proper
  // head-and-shoulders passport-style photo, never a full-body shot) ─────
  const [idPhotoErrors, setIdPhotoErrors] = useState({});
  const [activeTravelerIndex, setActiveTravelerIndex] = useState(0);
  const [idPhotoFilesByTraveler, setIdPhotoFilesByTraveler] = useState({});
  const [idPhotoPreviewsByTraveler, setIdPhotoPreviewsByTraveler] = useState({});
  const [travelerPhotoDone, setTravelerPhotoDone] = useState({});
  const [submittingIdPhoto, setSubmittingIdPhoto] = useState(false);
  const [idPhotoMessage, setIdPhotoMessage] = useState(null); // { text, tone: 'info'|'error'|'success' }
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // ── traveler identity, sourced from the server (GET /onboarding/status →
  // travelers[]) rather than from the `booking` prop. This is the DB record
  // of who each traveler slot actually belongs to (name + masked passport
  // number, captured during the passport scan step). It's what gets shown
  // to the client for confirmation before a photo can be taken/uploaded,
  // and its `verificationId` is echoed back on submit so the server can
  // reject the write if the slot's identity changed underneath us. Keyed
  // by travelerIndex. `null` while still loading.
  const [travelerIdentities, setTravelerIdentities] = useState(null);
  // Which traveler indices the user has explicitly confirmed ("Yes, this is
  // [Name]") in this modal session. Capture/upload controls stay locked for
  // a traveler until their identity card is confirmed — this is the actual
  // guard against attaching a photo to the wrong person on a multi-traveler
  // booking; everything else here is just supporting UI/plumbing for it.
  const [confirmedTravelers, setConfirmedTravelers] = useState({});

  const identityLoaded = travelerIdentities !== null;
  const activeIdentity = travelerIdentities?.[activeTravelerIndex] ?? null;
  const activeTraveler = activeIdentity?.hasIdentity
    ? { index: activeTravelerIndex, name: activeIdentity.name }
    : (bookingTravelers[activeTravelerIndex] ?? { index: activeTravelerIndex, name: `Traveler ${activeTravelerIndex + 1}` });
  const activeConfirmed = Boolean(confirmedTravelers[activeTravelerIndex]);
  const idPhotoFile = idPhotoFilesByTraveler[activeTravelerIndex] ?? null;
  const idPhotoPreview = idPhotoPreviewsByTraveler[activeTravelerIndex] ?? null;

  // ── Face-crop step: shown for every source (live webcam still, native
  // camera photo, or gallery upload) so the user positions/zooms their own
  // face into a fixed passport-photo frame before it's ever submitted. ───
  const PASSPORT_FRAME_W = 260;   // on-screen crop frame size (CSS px)
  const PASSPORT_FRAME_H = 336;   // ratio ≈ 0.774, matching standard 35×45mm passport photo proportions
  const PASSPORT_OUTPUT_W = 480;  // exported photo size (px) — same ratio, high enough res for printing
  const PASSPORT_OUTPUT_H = 620;
  const [cropSource, setCropSource] = useState(null); // { url, naturalWidth, naturalHeight } awaiting crop confirmation
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const cropFrameRef = useRef(null);
  const cropDragRef = useRef(null); // { startX, startY, startOffset }

  // ── In-app webcam capture (desktop / laptop) ────────────────────────────
  // Phones use the native camera app via <input capture> above — that's the
  // better experience (real focus/flash/etc). Desktop browsers don't support
  // that at all (capture is mobile-only per spec), so "Take Photo" there
  // opens a live getUserMedia() preview instead and grabs a still frame.
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [webcamStarting, setWebcamStarting] = useState(false);
  const [webcamError, setWebcamError] = useState(null);
  const videoRef = useRef(null);
  const webcamStreamRef = useRef(null);

  const isMobileDevice = useCallback(() => {
    if (typeof navigator === 'undefined') return false;
    return /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent || '');
  }, []);

  const stopWebcam = useCallback(() => {
    webcamStreamRef.current?.getTracks().forEach((t) => t.stop());
    webcamStreamRef.current = null;
    setWebcamOpen(false);
    setWebcamStarting(false);
  }, []);

  // Always release the camera when the modal unmounts (e.g. backdrop click,
  // browser back, successful submit) — never leave the light on.
  useEffect(() => () => { webcamStreamRef.current?.getTracks().forEach((t) => t.stop()); }, []);
  useEffect(() => () => { if (cropSource?.url) URL.revokeObjectURL(cropSource.url); }, [cropSource]);
  useEffect(() => () => {
    Object.values(idPhotoPreviewsByTraveler).forEach((url) => {
      if (typeof url === 'string' && url.startsWith('blob:')) URL.revokeObjectURL(url);
    });
  }, [idPhotoPreviewsByTraveler]);

  const openWebcam = useCallback(async () => {
    setIdPhotoErrors((p) => ({ ...p, file: undefined }));
    setWebcamError(null);
    setWebcamOpen(true);
    setWebcamStarting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      webcamStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setWebcamStarting(false);
    } catch {
      
      stopWebcam();
      setWebcamError('Could not access your camera. You can upload a photo instead.');
      // Don't leave the user stuck — fall back straight to the file picker.
      galleryInputRef.current?.click();
    }
  }, [stopWebcam]);

  const captureFromWebcam = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    // Grab the full, un-mirrored frame — the oval overlay is just a
    // positioning aid at this point. The frame then goes into the crop step
    // below, which is what actually enforces a tight, face-only passport
    // photo (fixing the old behaviour where the whole body could end up in
    // the saved image even though the oval only ever framed the face).
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      openCropStep(url, canvas.width, canvas.height);
      stopWebcam();
    }, 'image/jpeg', 0.92);
  };

  // ── Crop step: every accepted image (webcam still, native camera photo,
  // or gallery upload) lands here first. The user drags/zooms their face
  // into a fixed passport-ratio frame; nothing is submitted until they
  // confirm, so the final photo is always framed like a real passport photo
  // (head and shoulders only) regardless of how far they stood from the
  // camera when the source photo was taken. ──────────────────────────────
  const openCropStep = (url, naturalWidth, naturalHeight) => {
    setCropSource({ url, naturalWidth, naturalHeight });
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
  };

  const closeCropStep = () => {
    if (cropSource?.url) URL.revokeObjectURL(cropSource.url);
    setCropSource(null);
    cropDragRef.current = null;
  };

  // How much the image can be dragged, in on-screen crop-frame pixels,
  // before it would reveal empty space at an edge — keeps the frame always
  // fully covered by the photo, however the user drags or zooms it.
  const getCropBounds = useCallback(() => {
    if (!cropSource) return { maxX: 0, maxY: 0, displayScale: 1 };
    const { naturalWidth, naturalHeight } = cropSource;
    const coverScale = Math.max(PASSPORT_FRAME_W / naturalWidth, PASSPORT_FRAME_H / naturalHeight);
    const displayScale = coverScale * cropZoom;
    const displayedW = naturalWidth * displayScale;
    const displayedH = naturalHeight * displayScale;
    return {
      displayScale,
      maxX: Math.max(0, (displayedW - PASSPORT_FRAME_W) / 2),
      maxY: Math.max(0, (displayedH - PASSPORT_FRAME_H) / 2),
    };
  }, [cropSource, cropZoom]);

  const clampCropOffset = useCallback((offset, bounds) => ({
    x: Math.min(bounds.maxX, Math.max(-bounds.maxX, offset.x)),
    y: Math.min(bounds.maxY, Math.max(-bounds.maxY, offset.y)),
  }), []);

  const handleCropZoomChange = (nextZoom) => {
    const clampedZoom = Math.min(3, Math.max(1, nextZoom));
    setCropZoom(clampedZoom);
    // Re-clamp the existing offset against the new zoom level so the photo
    // never jumps to reveal a gap when zooming back out.
    const bounds = (() => {
      if (!cropSource) return { maxX: 0, maxY: 0 };
      const { naturalWidth, naturalHeight } = cropSource;
      const coverScale = Math.max(PASSPORT_FRAME_W / naturalWidth, PASSPORT_FRAME_H / naturalHeight);
      const displayScale = coverScale * clampedZoom;
      const displayedW = naturalWidth * displayScale;
      const displayedH = naturalHeight * displayScale;
      return {
        maxX: Math.max(0, (displayedW - PASSPORT_FRAME_W) / 2),
        maxY: Math.max(0, (displayedH - PASSPORT_FRAME_H) / 2),
      };
    })();
    setCropOffset((prev) => clampCropOffset(prev, bounds));
  };

  const handleCropPointerDown = (e) => {
    cropDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffset: { ...cropOffset },
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handleCropPointerMove = (e) => {
    if (!cropDragRef.current) return;
    const { startX, startY, startOffset } = cropDragRef.current;
    const bounds = getCropBounds();
    const next = {
      x: startOffset.x + (e.clientX - startX),
      y: startOffset.y + (e.clientY - startY),
    };
    setCropOffset(clampCropOffset(next, bounds));
  };

  const handleCropPointerUp = () => {
    cropDragRef.current = null;
  };

  const confirmCrop = () => {
    if (!cropSource) return;
    const { naturalWidth, naturalHeight, url } = cropSource;
    const { displayScale, maxX, maxY } = getCropBounds();
    const offset = clampCropOffset(cropOffset, { maxX, maxY });
    // Convert the on-screen frame + drag/zoom state into a source rectangle
    // in the original photo's own pixel coordinates.
    const displayedW = naturalWidth * displayScale;
    const displayedH = naturalHeight * displayScale;
    const left = (PASSPORT_FRAME_W - displayedW) / 2 + offset.x;
    const top = (PASSPORT_FRAME_H - displayedH) / 2 + offset.y;
    const sourceX = -left / displayScale;
    const sourceY = -top / displayScale;
    const sourceW = PASSPORT_FRAME_W / displayScale;
    const sourceH = PASSPORT_FRAME_H / displayScale;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = PASSPORT_OUTPUT_W;
      canvas.height = PASSPORT_OUTPUT_H;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, PASSPORT_OUTPUT_W, PASSPORT_OUTPUT_H);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], `id-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setIdPhotoErrors((p) => ({ ...p, file: undefined }));
        setIdPhotoFilesByTraveler((prev) => ({ ...prev, [activeTravelerIndex]: file }));
        setIdPhotoPreviewsByTraveler((prev) => {
          const oldUrl = prev[activeTravelerIndex];
          if (typeof oldUrl === 'string' && oldUrl.startsWith('blob:')) URL.revokeObjectURL(oldUrl);
          return { ...prev, [activeTravelerIndex]: URL.createObjectURL(file) };
        });
        closeCropStep();
      }, 'image/jpeg', 0.92);
    };
    img.src = url;
  };

  // Phones: open the native camera app. Everything else: in-app webcam.
  const handleTakePhotoClick = () => {
    if (isMobileDevice()) {
      cameraInputRef.current?.click();
    } else {
      openWebcam();
    }
  };

  // ── Load current completeness so a returning user resumes where they left off ──
  useEffect(() => {
    let cancelled = false;
    if (!packageId) { setLoadingStatus(false); return; }

    (async () => {
      try {
        const res = await request({ method: 'get', url: `/onboarding/status?packageId=${encodeURIComponent(packageId)}` });
        if (cancelled) return;
        const data = res?.data;
        if (!data) return;

        

        // Server-verified identity per traveler slot. Always set this (even
        // to an empty map) once the call resolves, so `identityLoaded`
        // flips and the UI stops showing a loading state for it.
        const identityByIndex = {};
        (Array.isArray(data.travelers) ? data.travelers : []).forEach((t, idx) => {
          const idxNum = Number(t?.travelerIndex ?? idx);
          if (!Number.isFinite(idxNum) || idxNum < 0 || idxNum >= travelerTotal) return;
          identityByIndex[idxNum] = {
            hasIdentity: Boolean(t?.hasIdentity),
            name: t?.name || null,
            passportNumberMasked: t?.passportNumberMasked || null,
            dateOfBirth: t?.dateOfBirth || null,
            verificationId: t?.verificationId || null,
          };
        });
        setTravelerIdentities(identityByIndex);

        const initialDoneMap = {};
        const photoRows = Array.isArray(data.idPhoto?.travelerPhotos)
          ? data.idPhoto.travelerPhotos
          : Array.isArray(data.idPhoto?.photos)
            ? data.idPhoto.photos
            : Array.isArray(data.idPhoto?.items)
              ? data.idPhoto.items
              : [];

        photoRows.forEach((row, idx) => {
          const rowIndex = Number(row?.travelerIndex ?? row?.traveler_index ?? idx);
          if (!Number.isFinite(rowIndex) || rowIndex < 0 || rowIndex >= travelerTotal) return;
          const url = row?.url ?? row?.facePhotoUrl ?? row?.photoUrl ?? null;
          initialDoneMap[rowIndex] = Boolean(row?.complete ?? url);
        });

        if (!photoRows.length && data.idPhoto?.url) initialDoneMap[0] = true;
        if (!photoRows.length && data.idPhoto?.complete) {
          for (let i = 0; i < travelerTotal; i += 1) initialDoneMap[i] = true;
        }

        const initialPhotoComplete = Object.keys(initialDoneMap).length
          ? Object.values(initialDoneMap).filter(Boolean).length >= travelerTotal
          : !!data.idPhoto?.complete;

        setCompleted({
          contact: !!data.contact?.complete,
          nextOfKin: !!data.nextOfKin?.complete,
          idPhoto: initialPhotoComplete,
        });

        if (data.contact?.email) setContact((c) => ({ ...c, email: data.contact.email }));
        if (data.contact?.phone) {
          const { dial, local } = splitPhone(data.contact.phone);
          setContact((c) => ({ ...c, phone: local }));
          setContactCountryCode(dial);
        }
        if (data.nextOfKin?.data) {
          const k = data.nextOfKin.data;
          const savedRelationship = k.relationship || '';
          const isKnownOption = RELATIONSHIP_OPTIONS.slice(0, -1).includes(savedRelationship);
          const { dial, local } = splitPhone(k.phone || '');
          setKin({
            fullName: k.full_name || '',
            relationship: savedRelationship ? (isKnownOption ? savedRelationship : 'Other') : '',
            phone: local, email: k.email || '',
          });
          setKinCountryCode(dial);
          if (savedRelationship && !isKnownOption) setRelationshipOther(savedRelationship);
        }
        const previewMap = {};
        const doneMap = { ...initialDoneMap };

        photoRows.forEach((row, idx) => {
          const rowIndex = Number(row?.travelerIndex ?? row?.traveler_index ?? idx);
          if (!Number.isFinite(rowIndex) || rowIndex < 0 || rowIndex >= travelerTotal) return;
          const url = row?.url ?? row?.facePhotoUrl ?? row?.photoUrl ?? null;
          if (url) previewMap[rowIndex] = url;
          doneMap[rowIndex] = Boolean(row?.complete ?? url);
        });

        if (!photoRows.length && data.idPhoto?.url) {
          previewMap[0] = data.idPhoto.url;
          doneMap[0] = true;
        }

        setIdPhotoPreviewsByTraveler((prev) => ({ ...prev, ...previewMap }));
        setTravelerPhotoDone(doneMap);

        const firstPhotoIncomplete = Array.from({ length: travelerTotal }).findIndex((_, idx) => !doneMap[idx]);
        setActiveTravelerIndex(firstPhotoIncomplete >= 0 ? firstPhotoIncomplete : 0);

        // Jump straight to the first incomplete step.
        const firstIncomplete = STEPS.find((s) => !(
          s === 'contact' ? data.contact?.complete
            : s === 'nextOfKin' ? data.nextOfKin?.complete
              : Object.keys(doneMap).length ? Object.values(doneMap).filter(Boolean).length >= travelerTotal : data.idPhoto?.complete
        ));
        if (firstIncomplete) {
          setStep(firstIncomplete);
        } else if (data.allComplete) {
          
          setStep('done');
        }
      } catch (err) {
        // Non-fatal — the form still works, it just won't be prefilled/resumed.
        
      } finally {
        if (!cancelled) setLoadingStatus(false);
      }
    })();

    return () => { cancelled = true; };
  }, [packageId, travelerTotal]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToNextIncompleteOrClose = useCallback((justCompletedStep, nextCompletedState) => {
    const remaining = STEPS.filter((s) => s !== justCompletedStep && !nextCompletedState[s]);
    
    if (remaining.length > 0) {
      setStep(remaining[0]);
    } else {
      setStep('done');
    }
  }, []);

  // ── Step 1 submit ──────────────────────────────────────────────────────
  const submitContact = async () => {
    const errs = {};
    const email = contact.email.trim();
    const localDigits = contact.phone.replace(/\D/g, '').replace(/^0+/, ''); // drop a leading 0, e.g. 07... -> 7...
    const phone = localDigits ? `${contactCountryCode}${localDigits}` : '';
    if (!email || !EMAIL_RE.test(email)) errs.email = 'Enter a valid email address.';
    if (localDigits.length < 6) errs.phone = 'Enter a valid mobile number.';
    setContactErrors(errs);
    if (Object.keys(errs).length) return;

    setSavingContact(true);
    setError('');
    try {
      await request({ method: 'post', url: '/onboarding/contact', data: { email, phone } });
      const next = { ...completed, contact: true };
      setCompleted(next);
      goToNextIncompleteOrClose('contact', next);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Could not save contact details.');
    } finally {
      setSavingContact(false);
    }
  };

  // ── Step 2 submit ──────────────────────────────────────────────────────
  const submitNextOfKin = async () => {
    const errs = {};
    const fullName = kin.fullName.trim();
    const localDigits = kin.phone.replace(/\D/g, '').replace(/^0+/, ''); // drop a leading 0, e.g. 07... -> 7...
    const phone = localDigits ? `${kinCountryCode}${localDigits}` : '';
    const email = kin.email.trim();
    const relationship = kin.relationship === 'Other' ? relationshipOther.trim() : kin.relationship;

    if (fullName.length < 2) errs.fullName = "Enter the next of kin's full name.";
    if (!kin.relationship) errs.relationship = 'Select a relationship.';
    if (kin.relationship === 'Other' && relationshipOther.trim().length < 2) {
      errs.relationshipOther = 'Enter the relationship.';
    }
    if (localDigits.length < 6) errs.phone = 'Enter a valid mobile number.';
    if (email && !EMAIL_RE.test(email)) errs.email = 'Enter a valid email address, or leave it blank.';
    setKinErrors(errs);
    if (Object.keys(errs).length) return;

    setSavingKin(true);
    setError('');
    try {
      await request({
        method: 'post',
        url: '/onboarding/next-of-kin',
        data: { packageId, fullName, relationship, phone, email: email || undefined },
      });
      const next = { ...completed, nextOfKin: true };
      setCompleted(next);
      goToNextIncompleteOrClose('nextOfKin', next);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Could not save next-of-kin details.');
    } finally {
      setSavingKin(false);
    }
  };

  // ── Step 3: file selection ─────────────────────────────────────────────
  const acceptImageFile = (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setIdPhotoErrors((p) => ({ ...p, file: 'Please choose a JPEG, PNG, or WebP photo.' }));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setIdPhotoErrors((p) => ({ ...p, file: 'That image is too large — please keep it under 8 MB.' }));
      return;
    }
    setIdPhotoErrors((p) => ({ ...p, file: undefined }));
    // Don't accept the source photo as-is — a gallery photo or native-camera
    // shot is very often a wider, full-body framing. Load it to get its
    // real dimensions, then hand it to the crop step so the user frames
    // their own face into the passport-photo box before it's saved.
    const url = URL.createObjectURL(file);
    const probe = new Image();
    probe.onload = () => openCropStep(url, probe.naturalWidth, probe.naturalHeight);
    probe.onerror = () => {
      URL.revokeObjectURL(url);
      setIdPhotoErrors((p) => ({ ...p, file: 'Could not read that image — please try another.' }));
    };
    probe.src = url;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    // Reset both inputs so selecting the same file again (e.g. Retake with
    // the same shot) still fires onChange, and so the unused input doesn't
    // hold a stale selection.
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    acceptImageFile(file);
  };

  // ── Step 3 submit — direct upload, no OCR. The file here is always the
  // already-cropped output of the crop step, not the raw source photo. ───
  const submitIdPhoto = async () => {
    if (!idPhotoFile && travelerPhotoDone[activeTravelerIndex]) {
      const nextPending = Array.from({ length: travelerTotal }).findIndex((_, idx) => !travelerPhotoDone[idx]);
      if (nextPending >= 0) {
        setActiveTravelerIndex(nextPending);
        setIdPhotoMessage({ text: 'This traveler already has a saved photo. Continue with the next traveler.', tone: 'info' });
      } else {
        const next = { ...completed, idPhoto: true };
        setCompleted(next);
        goToNextIncompleteOrClose('idPhoto', next);
      }
      return;
    }

    const errs = {};
    if (!idPhotoFile) errs.file = 'Please take or upload a clear photo with a plain background.';
    if (!activeIdentity?.hasIdentity) {
      errs.file = 'Passport details for this traveler have not been captured yet. Please complete their passport scan first.';
    } else if (!activeConfirmed) {
      errs.file = `Please confirm this photo is for ${activeIdentity.name} before uploading.`;
    }
    setIdPhotoErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmittingIdPhoto(true);
    setError('');
    setIdPhotoMessage(null);
    try {
      const form = new FormData();
      form.append('packageId', packageId);
      if (booking?.id) form.append('bookingId', booking.id);
      form.append('travelerIndex', String(activeTravelerIndex));
      // Echoes back the identity the user was shown and confirmed on screen
      // — the server independently verifies this still matches the DB
      // record for this traveler slot before saving anything. See
      // saveFacePhoto's identity-binding check.
      form.append('travelerVerificationId', String(activeIdentity.verificationId));
      form.append('face', idPhotoFile);

      const res = await request({
        method: 'post',
        url: '/passport/face-photo',
        data: form,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = res?.data;
      if (data?.success !== false) {
        const savedUrl = data?.url ?? data?.facePhotoUrl ?? data?.photoUrl;
        if (savedUrl) {
          setIdPhotoPreviewsByTraveler((prev) => {
            const old = prev[activeTravelerIndex];
            if (typeof old === 'string' && old.startsWith('blob:')) URL.revokeObjectURL(old);
            return { ...prev, [activeTravelerIndex]: savedUrl };
          });
        }

        const nextDoneMap = { ...travelerPhotoDone, [activeTravelerIndex]: true };
        setTravelerPhotoDone(nextDoneMap);
        const allDone = Array.from({ length: travelerTotal }).every((_, idx) => Boolean(nextDoneMap[idx]));

        if (allDone) {
          setIdPhotoMessage({ text: data?.message || 'All traveler photos saved.', tone: 'success' });
          const next = { ...completed, idPhoto: true };
          setCompleted(next);
          setTimeout(() => goToNextIncompleteOrClose('idPhoto', next), 700);
        } else {
          const nextTraveler = Array.from({ length: travelerTotal }).findIndex((_, idx) => !nextDoneMap[idx]);
          if (nextTraveler >= 0) setActiveTravelerIndex(nextTraveler);
          setIdPhotoMessage({ text: data?.message || 'Photo saved. Continue with the next traveler.', tone: 'success' });
          setIdPhotoErrors({});
        }
      } else {
        setIdPhotoMessage({ text: data?.error || data?.message || 'Could not save photo. Please try again.', tone: 'error' });
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err.message || 'Could not save photo. Please try again.';
      setIdPhotoMessage({ text: msg, tone: 'error' });
      // Drop the stale confirmation for this traveler — a failed upload
      // (especially a 409 identity mismatch, meaning the record we showed
      // the user is no longer what's in the DB) means what was on screen
      // can no longer be trusted. Force a fresh look before retrying.
      setConfirmedTravelers((prev) => {
        const next = { ...prev };
        delete next[activeTravelerIndex];
        return next;
      });
    } finally {
      setSubmittingIdPhoto(false);
    }
  };

  if (!booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-white font-semibold text-base">Just a few more details</h2>
            <p className="text-emerald-50 text-xs mt-0.5 line-clamp-1">Required to confirm {packageName}</p>
          </div>
          <button onClick={() => { stopWebcam(); closeCropStep(); onClose(); }} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {loadingStatus ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 text-emerald-600 animate-spin" />
            </div>
          ) : (
            <>
              <StepDots current={step} completed={completed} />

              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
                </div>
              )}

              {/* ── Step 1: Contact ───────────────────────────────────── */}
              {step === 'contact' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-900 font-medium">
                    <Mail className="h-4 w-4 text-emerald-600" /> {STEP_LABELS.contact}
                  </div>
                  <p className="text-xs text-gray-500 -mt-2">
                    So we (and your travel agent) can reach you about this trip.
                  </p>
                  <TextInput
                    icon={Mail}
                    type="email"
                    placeholder="you@example.com"
                    value={contact.email}
                    onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                    error={contactErrors.email}
                  />
                  <div>
                    <div className="flex gap-2">
                      <div className={`flex-shrink-0 w-[42%] flex items-center gap-1 rounded-lg border px-2 py-2.5 transition-colors ${
                        contactErrors.phone ? 'border-red-400 bg-red-50' : 'border-gray-300 focus-within:border-emerald-500 bg-white'
                      }`}>
                        <select
                          value={contactCountryCode}
                          onChange={(e) => setContactCountryCode(e.target.value)}
                          className="w-full bg-transparent text-sm text-gray-900 outline-none appearance-none"
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={c.dial + c.name} value={c.dial}>
                              {c.dial} {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className={`flex-1 flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors ${
                        contactErrors.phone ? 'border-red-400 bg-red-50' : 'border-gray-300 focus-within:border-emerald-500 bg-white'
                      }`}>
                        <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <input
                          type="tel"
                          placeholder="7XXXXXXXX"
                          value={contact.phone}
                          onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                          className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
                        />
                      </div>
                    </div>
                    <FieldError>{contactErrors.phone}</FieldError>
                    <p className="mt-1 text-xs text-gray-400">Select your country, then enter your number (leading 0 is fine).</p>
                  </div>
                  <button
                    onClick={submitContact}
                    disabled={savingContact}
                    className="w-full py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {savingContact ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save &amp; Continue <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* ── Step 2: Next of Kin ───────────────────────────────── */}
              {step === 'nextOfKin' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-900 font-medium">
                    <Users className="h-4 w-4 text-emerald-600" /> {STEP_LABELS.nextOfKin}
                  </div>
                  <p className="text-xs text-gray-500 -mt-2">
                    Someone we can contact in an emergency during your trip.
                  </p>
                  <TextInput
                    icon={UserIcon}
                    placeholder="Full name"
                    value={kin.fullName}
                    onChange={(e) => setKin((k) => ({ ...k, fullName: e.target.value }))}
                    error={kinErrors.fullName}
                  />
                  <SelectInput
                    icon={Users}
                    value={kin.relationship}
                    onChange={(e) => setKin((k) => ({ ...k, relationship: e.target.value }))}
                    error={kinErrors.relationship}
                  >
                    <option value="" disabled>Select relationship</option>
                    {RELATIONSHIP_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </SelectInput>
                  {kin.relationship === 'Other' && (
                    <TextInput
                      placeholder="Please specify relationship"
                      value={relationshipOther}
                      onChange={(e) => setRelationshipOther(e.target.value)}
                      error={kinErrors.relationshipOther}
                    />
                  )}
                  <div>
                    <div className="flex gap-2">
                      <div className={`flex-shrink-0 w-[42%] flex items-center gap-1 rounded-lg border px-2 py-2.5 transition-colors ${
                        kinErrors.phone ? 'border-red-400 bg-red-50' : 'border-gray-300 focus-within:border-emerald-500 bg-white'
                      }`}>
                        <select
                          value={kinCountryCode}
                          onChange={(e) => setKinCountryCode(e.target.value)}
                          className="w-full bg-transparent text-sm text-gray-900 outline-none appearance-none"
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={c.dial + c.name} value={c.dial}>
                              {c.dial} {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className={`flex-1 flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors ${
                        kinErrors.phone ? 'border-red-400 bg-red-50' : 'border-gray-300 focus-within:border-emerald-500 bg-white'
                      }`}>
                        <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <input
                          type="tel"
                          placeholder="7XXXXXXXX"
                          value={kin.phone}
                          onChange={(e) => setKin((k) => ({ ...k, phone: e.target.value }))}
                          className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
                        />
                      </div>
                    </div>
                    <FieldError>{kinErrors.phone}</FieldError>
                    <p className="mt-1 text-xs text-gray-400">Select their country, then enter the number (leading 0 is fine).</p>
                  </div>
                  <TextInput
                    icon={Mail}
                    type="email"
                    placeholder="Email (optional)"
                    value={kin.email}
                    onChange={(e) => setKin((k) => ({ ...k, email: e.target.value }))}
                    error={kinErrors.email}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStep('contact')}
                      className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 flex items-center gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" /> Back
                    </button>
                    <button
                      onClick={submitNextOfKin}
                      disabled={savingKin}
                      className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {savingKin ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Save &amp; Continue <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 3: Umrah ID Photo (direct upload, no OCR/cropping) ── */}
              {step === 'idPhoto' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-900 font-medium">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" /> {STEP_LABELS.idPhoto}
                  </div>
                  <p className="text-xs text-gray-500 -mt-2">
                    Take or upload a clear, front-facing photo against a plain, light background —
                    like a passport photo. This is used exactly as submitted for your Umrah ID card,
                    so make sure it's sharp, well-lit, and shows your face clearly.
                  </p>

                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-emerald-900">
                        Traveler photos {Object.values(travelerPhotoDone).filter(Boolean).length}/{travelerTotal}
                      </p>
                      <p className="text-xs text-emerald-700">
                        Current: {activeTraveler.name}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {bookingTravelers.map((traveler) => {
                        const isActive = activeTravelerIndex === traveler.index;
                        const isDone = Boolean(travelerPhotoDone[traveler.index]);
                        return (
                          <button
                            key={traveler.index}
                            type="button"
                            onClick={() => {
                              setActiveTravelerIndex(traveler.index);
                              setIdPhotoErrors({});
                              setIdPhotoMessage(null);
                            }}
                            className={`text-left rounded-md px-2.5 py-2 text-xs border transition-colors ${
                              isActive
                                ? 'border-emerald-500 bg-white text-emerald-800'
                                : isDone
                                  ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                                  : 'border-emerald-100 bg-white text-gray-700 hover:bg-emerald-100'
                            }`}
                          >
                            <p className="font-semibold truncate">{traveler.name}</p>
                            <p className="text-[11px]">
                              {isDone ? 'Photo saved' : 'Photo pending'}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Identity confirmation gate ──────────────────────────────
                      This is the actual fix for "wrong photo attached to wrong
                      traveler" on multi-traveler bookings: before any capture or
                      upload control is shown, the client fetches this traveler's
                      real name and passport number from the server (never from a
                      client-side label) and makes the user explicitly confirm it.
                      Only after that confirmation do the camera/upload buttons
                      render at all — see `activeConfirmed` below. */}
                  {!identityLoaded ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading traveler details…
                    </div>
                  ) : !activeIdentity?.hasIdentity ? (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 flex items-start gap-2.5">
                      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-amber-900">Passport details missing</p>
                        <p className="text-xs text-amber-800 mt-0.5">
                          We can't accept an ID photo for this traveler until their passport has been scanned and
                          verified — that's what a photo would otherwise be attached to. Please complete their
                          passport step first.
                        </p>
                      </div>
                    </div>
                  ) : !activeConfirmed ? (
                    <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-emerald-700" />
                        <p className="text-sm font-semibold text-emerald-900">Confirm who this photo is for</p>
                      </div>
                      <div className="rounded-md bg-white border border-emerald-200 px-3 py-2.5 text-sm">
                        <p className="font-semibold text-gray-900">{activeIdentity.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {activeIdentity.passportNumberMasked ? `Passport ${activeIdentity.passportNumberMasked}` : 'Passport on file'}
                          {activeIdentity.dateOfBirth ? ` · DOB ${new Date(activeIdentity.dateOfBirth).toLocaleDateString('en-GB')}` : ''}
                        </p>
                      </div>
                      <p className="text-xs text-emerald-800">
                        Double-check this matches the traveler you're photographing — the photo will be permanently
                        attached to this passport record and used on their Umrah ID card.
                      </p>
                      <button
                        type="button"
                        onClick={() => setConfirmedTravelers((prev) => ({ ...prev, [activeTravelerIndex]: true }))}
                        className="w-full py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle className="h-4 w-4" /> Yes, this is {activeIdentity.name.split(' ')[0]} — continue
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 flex items-center justify-between gap-2 text-xs">
                        <span className="text-emerald-800">
                          <span className="font-semibold">Uploading for:</span> {activeIdentity.name}
                          {activeIdentity.passportNumberMasked ? ` · ${activeIdentity.passportNumberMasked}` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => setConfirmedTravelers((prev) => {
                            const next = { ...prev };
                            delete next[activeTravelerIndex];
                            return next;
                          })}
                          className="text-emerald-700 underline hover:text-emerald-900 flex-shrink-0"
                        >
                          Not right?
                        </button>
                      </div>
                  <div>
                    {/* Two separate inputs, on purpose. A single <input capture> wrapped
                        in a <label> is unreliable across mobile browsers — some skip the
                        camera/gallery chooser entirely and jump straight to file browsing,
                        which is what was happening here. Two explicit buttons give the
                        user an unambiguous choice on phones, and degrade gracefully on
                        desktop (capture is simply ignored there, so both open the normal
                        file picker).

                        accept="image/*" (not a specific MIME list) on the CAMERA input is
                        deliberate: several Android browsers (Chrome's WebView especially)
                        only launch the camera directly when accept is the image/* wildcard —
                        a comma-separated list of explicit types makes them treat it as a
                        generic file input and fall back to the file manager instead, which
                        is the bug this fixes. JPEG/PNG/WebP-only is still enforced after
                        the photo is picked, in handleFileSelect. */}
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="id-photo-camera-input"
                    />
                    <input
                      ref={galleryInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="id-photo-gallery-input"
                    />

                    {cropSource ? (
                      <div className="rounded-lg border-2 border-emerald-300 bg-gray-900 py-4 px-3 flex flex-col items-center gap-3">
                        <p className="text-xs text-white/80 text-center">
                          Drag to reposition, zoom to fill the frame with just your head and shoulders — like a real passport photo
                        </p>
                        <div
                          ref={cropFrameRef}
                          className="relative overflow-hidden rounded-[50%] border-2 border-dashed border-white/80 touch-none cursor-grab active:cursor-grabbing select-none"
                          style={{ width: PASSPORT_FRAME_W, height: PASSPORT_FRAME_H, touchAction: 'none' }}
                          onPointerDown={handleCropPointerDown}
                          onPointerMove={handleCropPointerMove}
                          onPointerUp={handleCropPointerUp}
                          onPointerLeave={handleCropPointerUp}
                        >
                          {(() => {
                            const { displayScale } = getCropBounds();
                            const displayedW = cropSource.naturalWidth * displayScale;
                            const displayedH = cropSource.naturalHeight * displayScale;
                            const left = (PASSPORT_FRAME_W - displayedW) / 2 + cropOffset.x;
                            const top = (PASSPORT_FRAME_H - displayedH) / 2 + cropOffset.y;
                            return (
                              <img
                                src={cropSource.url}
                                alt="Position your face"
                                draggable={false}
                                className="absolute max-w-none pointer-events-none"
                                style={{ width: displayedW, height: displayedH, left, top }}
                              />
                            );
                          })()}
                        </div>
                        <div className="flex items-center gap-2 w-full px-1">
                          <span className="text-white/70 text-xs">Zoom</span>
                          <input
                            type="range"
                            min="1"
                            max="3"
                            step="0.01"
                            value={cropZoom}
                            onChange={(e) => handleCropZoomChange(parseFloat(e.target.value))}
                            className="flex-1 accent-emerald-500"
                          />
                        </div>
                        <div className="flex gap-2 w-full">
                          <button
                            type="button"
                            onClick={closeCropStep}
                            className="flex-1 py-2.5 rounded-lg border border-white/30 text-white text-sm font-semibold hover:bg-white/10"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={confirmCrop}
                            className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 flex items-center justify-center gap-1.5"
                          >
                            <ShieldCheck className="h-4 w-4" /> Use This Photo
                          </button>
                        </div>
                      </div>
                    ) : webcamOpen ? (
                      <div className="rounded-lg border-2 border-emerald-300 bg-black py-3 px-3 flex flex-col items-center gap-3">
                        {webcamStarting && (
                          <div className="w-full aspect-square max-h-80 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 text-white animate-spin" />
                          </div>
                        )}
                        <div className={`relative w-full max-h-80 rounded-md overflow-hidden ${webcamStarting ? 'hidden' : ''}`}>
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full max-h-80 rounded-md object-cover block"
                            style={{ transform: 'scaleX(-1)' }} /* mirror the preview only — the captured frame is not flipped */
                          />
                          {/* Face-guide oval: darkens everything outside it so the user
                              knows roughly where to position their face before capturing.
                              Sized deliberately large (most of the frame height) so the user
                              can stay at a normal arm's-length/desk distance instead of
                              backing away to shrink their face down to fit a small oval.
                              It's a positioning aid only — the still grabs the full frame,
                              and the crop step right after this (see cropSource) is what
                              actually enforces the tight passport-style framing. */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div
                              className="w-44 h-56 sm:w-52 sm:h-64 rounded-[50%] border-2 border-dashed border-white/80"
                              style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }}
                            />
                          </div>
                        </div>
                        {!webcamStarting && (
                          <p className="text-xs text-white/80 -mt-1">Stay where you are and fill the oval with your head and shoulders</p>
                        )}
                        <div className="flex gap-2 w-full">
                          <button
                            type="button"
                            onClick={stopWebcam}
                            className="flex-1 py-2.5 rounded-lg border border-white/30 text-white text-sm font-semibold hover:bg-white/10"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={captureFromWebcam}
                            disabled={webcamStarting}
                            className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-1.5"
                          >
                            <Camera className="h-4 w-4" /> Capture
                          </button>
                        </div>
                      </div>
                    ) : idPhotoPreview ? (
                      <div className={`rounded-lg border-2 py-4 px-3 flex flex-col items-center gap-3 ${
                        idPhotoErrors.file ? 'border-red-400 bg-red-50' : 'border-emerald-300 bg-emerald-50'
                      }`}>
                        <img src={idPhotoPreview} alt="ID photo preview" className="max-h-40 rounded-md object-contain" />
                        <div className="flex gap-2 w-full">
                          <button
                            type="button"
                            onClick={handleTakePhotoClick}
                            className="flex-1 py-2 rounded-lg border border-emerald-300 bg-white text-emerald-700 text-xs font-semibold hover:bg-emerald-50 flex items-center justify-center gap-1.5"
                          >
                            <Camera className="h-3.5 w-3.5" /> Retake
                          </button>
                          <button
                            type="button"
                            onClick={() => galleryInputRef.current?.click()}
                            className="flex-1 py-2 rounded-lg border border-emerald-300 bg-white text-emerald-700 text-xs font-semibold hover:bg-emerald-50 flex items-center justify-center gap-1.5"
                          >
                            <Upload className="h-3.5 w-3.5" /> Choose different
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={`rounded-lg border-2 border-dashed py-6 px-3 flex flex-col items-center gap-3 ${
                        idPhotoErrors.file ? 'border-red-400 bg-red-50' : 'border-emerald-300 bg-emerald-50'
                      }`}>
                        <div className="flex flex-col items-center text-emerald-700">
                          <ShieldCheck className="h-6 w-6 mb-1" />
                          <span className="text-xs text-emerald-600">JPEG, PNG or WebP, max 8 MB</span>
                        </div>
                        <div className="flex gap-2 w-full">
                          <button
                            type="button"
                            onClick={handleTakePhotoClick}
                            className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 flex items-center justify-center gap-1.5"
                          >
                            <Camera className="h-4 w-4" /> Take Photo
                          </button>
                          <button
                            type="button"
                            onClick={() => galleryInputRef.current?.click()}
                            className="flex-1 py-2.5 rounded-lg border border-emerald-300 bg-white text-emerald-700 text-sm font-semibold hover:bg-emerald-100 flex items-center justify-center gap-1.5"
                          >
                            <Upload className="h-4 w-4" /> Upload from Gallery
                          </button>
                        </div>
                        {webcamError && (
                          <p className="text-xs text-red-600 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" /> {webcamError}
                          </p>
                        )}
                      </div>
                    )}
                    <FieldError>{idPhotoErrors.file}</FieldError>
                  </div>
                    </>
                  )}

                  <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
                    <li>Plain, light-colored background — no patterns or clutter behind you</li>
                    <li>Face the camera directly, both eyes open, neutral expression</li>
                    <li>No sunglasses or hats; good, even lighting with no harsh shadows</li>
                    <li>Frame just your head and shoulders — not your whole body — like a real passport photo</li>
                  </ul>

                  {idPhotoMessage && (
                    <div
                      className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                        idPhotoMessage.tone === 'error'
                          ? 'bg-red-50 border border-red-200 text-red-700'
                          : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                      }`}
                    >
                      {idPhotoMessage.tone === 'error'
                        ? <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        : <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
                      <p>{idPhotoMessage.text}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => { stopWebcam(); closeCropStep(); setStep('nextOfKin'); }}
                      className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 flex items-center gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" /> Back
                    </button>
                    <button
                      onClick={submitIdPhoto}
                      disabled={submittingIdPhoto}
                      className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {submittingIdPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      {submittingIdPhoto
                        ? 'Saving…'
                        : (Object.values(travelerPhotoDone).filter(Boolean).length + 1 >= travelerTotal
                          ? 'Save Final Photo'
                          : 'Save & Next Traveler')}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Done ───────────────────────────────────────────────── */}
              {step === 'done' && (
                <div className="flex flex-col items-center text-center py-4 space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-gray-900 font-semibold text-base">All set!</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Your contact details, next-of-kin, and Umrah ID photos are all on file for {packageName}.
                    </p>
                  </div>
                  <div className="w-full space-y-1.5 text-left text-sm">
                    {STEPS.map((s) => (
                      <div key={s} className="flex items-center gap-2 text-gray-600">
                        <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        {s === 'idPhoto' ? `${STEP_LABELS[s]} (${travelerTotal}/${travelerTotal})` : STEP_LABELS[s]}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => onComplete?.()}
                    className="w-full py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                  >
                    Done
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostBookingModal;