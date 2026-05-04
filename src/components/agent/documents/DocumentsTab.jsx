import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  FileText, Upload, CheckCircle, AlertCircle, Clock,
  RefreshCw, Eye, X, Loader, CloudUpload, File, Camera, MapPin, Info, Link, ExternalLink, Save
} from 'lucide-react';

/**
 * DocumentsTab — Agent document upload/update UI
 *
 * Backend: POST /api/documents  (document_routes.js)
 *   Fields: incorporation | tourism | krapin  (multipart/form-data)
 *   Auth:   requireAuth cookie (credentials: 'include')
 *
 * Storage: Supabase bucket "agent-documents"
 *   Paths returned are stored in agentProfile / fetched from
 *   /api/auth/me so we can derive whether a doc is already uploaded.
 *
 * Usage in AgentDashboard:
 *   Replace the {activeTab === 'documents' && ( … )} block with:
 *
 *   {activeTab === 'documents' && (
 *     <DocumentsTab agentId={profile?.id} authToken={null} />
 *   )}
 *
 *   `authToken` is optional — if you use cookie auth (credentials:'include')
 *   just omit it. If you use Bearer tokens pass it in.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

const ACCEPTED = 'image/jpeg,image/png,image/webp,application/pdf';
const MAX_MB   = 5;
const MAX_BYTES = MAX_MB * 1024 * 1024;

const DOC_TYPES = [
  {
    key:         'incorporation',
    label:       'Certificate of Incorporation',
    description: 'Official company registration certificate',
    icon:        '🏢',
  },
  {
    key:         'tourism',
    label:       'Tourism License',
    description: 'Government-issued tourism operator license',
    icon:        '✈️',
  },
  {
    key:         'krapin',
    label:       'KRA PIN Certificate',
    description: 'Kenya Revenue Authority PIN registration',
    icon:        '📋',
  },
  {
    key:         'director_id',
    label:       'Director / Manager ID',
    description: 'National ID or passport of the company director or manager',
    icon:        '🪪',
  },
  {
    key:         'office_photo',
    label:       'Office Photo',
    description: 'Clear photo of your physical office entrance or interior confirming presence & location. Include your street-visible signage if possible.',
    icon:        '🏬',
  },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status) {
  const map = {
    uploaded: { cls: 'bg-amber-100 text-amber-700', label: 'Pending Review' },
    verified: { cls: 'bg-green-100 text-green-700',  label: 'Verified'       },
    rejected: { cls: 'bg-red-100 text-red-700',      label: 'Rejected'       },
    none:     { cls: 'bg-gray-100 text-gray-500',    label: 'Not Uploaded'   },
  };
  const s = map[status] ?? map.none;
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

function statusIcon(status) {
  if (status === 'verified') return <CheckCircle className="h-5 w-5 text-green-500" />;
  if (status === 'rejected') return <AlertCircle className="h-5 w-5 text-red-500" />;
  if (status === 'uploaded') return <Clock className="h-5 w-5 text-amber-500" />;
  return <FileText className="h-5 w-5 text-gray-400" />;
}

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── DocumentPreviewModal ─────────────────────────────────────────────────────

const DocumentPreviewModal = ({ doc, onClose }) => {
  const isPdf = doc.publicUrl?.toLowerCase().includes('.pdf') ||
                doc.path?.toLowerCase().endsWith('.pdf');

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">{doc.icon}</span>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{doc.label}</h3>
              {doc.uploadedAt && (
                <p className="text-[11px] text-gray-400">
                  Uploaded {new Date(doc.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge(doc.status)}
            <a
              href={doc.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500"
              title="Open in new tab"
            >
              <Eye className="h-4 w-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center min-h-[300px]">
          {isPdf ? (
            <iframe
              src={doc.publicUrl}
              className="w-full h-full min-h-[500px]"
              title={doc.label}
            />
          ) : (
            <img
              src={doc.publicUrl}
              alt={doc.label}
              className="max-w-full max-h-[60vh] object-contain rounded-xl m-4 shadow"
            />
          )}
        </div>

        {/* Status footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-white flex items-center gap-2">
          {statusIcon(doc.status)}
          <span className="text-xs text-gray-500">
            {doc.status === 'verified' && 'Document verified by admin.'}
            {doc.status === 'rejected' && (doc.rejectionReason || 'Document was rejected. Please re-upload.')}
            {doc.status === 'uploaded' && 'Awaiting admin review.'}
            {doc.status === 'none'     && 'No document uploaded yet.'}
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── DropZone ─────────────────────────────────────────────────────────────────

const DropZone = ({ docKey, onFile, disabled }) => {
  const [drag, setDrag]   = useState(false);
  const [error, setError] = useState('');
  const inputRef          = useRef(null);

  const validate = (file) => {
    if (!file) return 'No file selected.';
    const okType = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type);
    if (!okType) return 'Only JPEG, PNG, WebP, or PDF files are allowed.';
    if (file.size > MAX_BYTES) return `File too large. Max ${MAX_MB} MB.`;
    return null;
  };

  const handle = (file) => {
    const err = validate(file);
    if (err) { setError(err); return; }
    setError('');
    onFile(docKey, file);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDrag(false);
    if (disabled) return;
    handle(e.dataTransfer.files[0]);
  }, [disabled]); // eslint-disable-line

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`
          mt-3 border-2 border-dashed rounded-xl px-4 py-6 flex flex-col items-center gap-2
          transition-colors cursor-pointer select-none
          ${disabled  ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
          : drag      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/40'}
        `}
      >
        <CloudUpload className={`h-7 w-7 ${drag ? 'text-blue-500' : 'text-gray-300'}`} />
        <p className="text-xs text-gray-500 text-center">
          <span className="font-medium text-blue-600">Click to upload</span> or drag & drop<br />
          JPEG · PNG · WebP · PDF — max {MAX_MB} MB
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => handle(e.target.files[0])}
        disabled={disabled}
      />
      {error && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{error}</p>}
    </div>
  );
};

// ─── DocumentCard ─────────────────────────────────────────────────────────────

const DocumentCard = ({ doc, staged, onFile, onClearStaged, onUpload, uploading, onMapsUrlSave }) => {
  const hasUploaded = !!doc.path;
  const hasPending  = !!staged;
  const [showPreview, setShowPreview] = useState(false);
  const [mapsUrl,    setMapsUrl]    = useState(doc.mapsUrl || '');
  const [savingMaps, setSavingMaps] = useState(false);
  const [mapsSaved,  setMapsSaved]  = useState(false);
  const [mapsError,  setMapsError]  = useState('');

  const onSaveMapsUrl = async () => {
    if (!mapsUrl) return;
    // Basic Google Maps URL validation
    if (!mapsUrl.includes('google.com/maps') && !mapsUrl.includes('maps.app.goo.gl') && !mapsUrl.includes('goo.gl/maps')) {
      setMapsError('Please paste a valid Google Maps link.');
      return;
    }
    setSavingMaps(true);
    setMapsError('');
    try {
      await onMapsUrlSave(mapsUrl);
      setMapsSaved(true);
      setTimeout(() => setMapsSaved(false), 4000);
    } catch (err) {
      setMapsError(err.message || 'Failed to save location.');
    } finally {
      setSavingMaps(false);
    }
  };

  return (
    <>
    {showPreview && doc.publicUrl && (
      <DocumentPreviewModal doc={doc} onClose={() => setShowPreview(false)} />
    )}
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="text-2xl leading-none mt-0.5">{doc.icon}</div>
          <div>
            <h4 className="font-semibold text-gray-900 text-sm">{doc.label}</h4>
            <p className="text-xs text-gray-400 mt-0.5">{doc.description}</p>
            {doc.uploadedAt && (
              <p className="text-[11px] text-gray-400 mt-1">
                Last uploaded: {new Date(doc.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
        <div className="flex-shrink-0">{statusBadge(doc.status)}</div>
      </div>

      {/* Status row */}
      <div className="px-5 pb-3 flex items-center gap-2">
        {statusIcon(doc.status)}
        <span className="text-xs text-gray-500">
          {doc.status === 'verified' && 'Document verified by admin.'}
          {doc.status === 'rejected' && (doc.rejectionReason || 'Document was rejected. Please re-upload.')}
          {doc.status === 'uploaded' && 'Awaiting admin review.'}
          {doc.status === 'none'     && 'No document uploaded yet.'}
        </span>
      </div>

      {/* Office photo guidance tip */}
      {doc.key === 'office_photo' && doc.status === 'none' && (
        <div className="mx-5 mb-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
          <div className="flex items-center gap-1.5 mb-2">
            <Info className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-amber-700">What to photograph</span>
          </div>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2">
              <Camera className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <span className="text-[11px] text-amber-700"><span className="font-medium">Street-facing signage</span> — your agency name clearly visible on the building or door entrance.</span>
            </li>
            <li className="flex items-start gap-2">
              <Camera className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <span className="text-[11px] text-amber-700"><span className="font-medium">Interior shot</span> — desks, computers, or staff visible to confirm the office is operational.</span>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <span className="text-[11px] text-amber-700"><span className="font-medium">Google Maps pin</span> <span className="text-amber-500">(optional)</span> — paste your office Google Maps link below to pin your exact location.</span>
            </li>
          </ul>
          <p className="text-[10px] text-amber-500 mt-2">Tip: combine all photos into a single PDF or upload the clearest single image.</p>
        </div>
      )}

      {/* Google Maps pin input — office_photo card only */}
      {doc.key === 'office_photo' && (
        <div className="mx-5 mb-3">
          <p className="text-[11px] font-medium text-gray-600 mb-1.5 flex items-center gap-1">
            <MapPin className="h-3 w-3 text-blue-500" /> Office Google Maps Link <span className="text-gray-400 font-normal">(optional)</span>
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="url"
                value={mapsUrl}
                onChange={e => { setMapsUrl(e.target.value); setMapsError(''); setMapsSaved(false); }}
                placeholder="https://maps.google.com/maps?q=..."
                className="w-full pl-7 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-gray-500" title="Preview">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <button
              onClick={onSaveMapsUrl}
              disabled={!mapsUrl || savingMaps}
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {savingMaps ? <Loader className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              {mapsSaved ? 'Saved!' : 'Save'}
            </button>
          </div>
          {mapsError && <p className="mt-1 text-[11px] text-red-500">{mapsError}</p>}
          {mapsSaved && <p className="mt-1 text-[11px] text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Location saved successfully.</p>}
          {doc.mapsUrl && !mapsUrl && (
            <p className="mt-1 text-[11px] text-gray-400 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Saved: <a href={doc.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate">{doc.mapsUrl}</a>
            </p>
          )}
        </div>
      )}

      {/* Staged file preview */}
      {hasPending && (
        <div className="mx-5 mb-3 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
          <File className="h-4 w-4 text-blue-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-blue-800 truncate">{staged.name}</p>
            <p className="text-[11px] text-blue-500">{humanSize(staged.size)}</p>
          </div>
          <button
            onClick={() => onClearStaged(doc.key)}
            className="p-1 rounded-lg hover:bg-blue-100 transition-colors"
            title="Remove"
          >
            <X className="h-3.5 w-3.5 text-blue-400" />
          </button>
        </div>
      )}

      {/* Drop zone — hidden while uploading */}
      {!uploading && (
        <div className="px-5 pb-4">
          <DropZone docKey={doc.key} onFile={onFile} disabled={uploading} />
        </div>
      )}

      {/* Actions */}
      <div className="px-5 pb-5 flex items-center gap-2">
        {hasUploaded && doc.publicUrl && (
          <button
            onClick={() => setShowPreview(true)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors font-medium text-gray-700"
          >
            <Eye className="h-4 w-4" /> View
          </button>
        )}

        <button
          onClick={() => onUpload(doc.key)}
          disabled={!hasPending || uploading}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-xl font-medium transition-all ${
            hasPending && !uploading
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md hover:shadow-lg hover:scale-[1.02]'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {uploading
            ? <><Loader className="h-4 w-4 animate-spin" /> Uploading…</>
            : hasUploaded
            ? <><RefreshCw className="h-4 w-4" /> Update</>
            : <><Upload className="h-4 w-4" /> Upload</>
          }
        </button>
      </div>
    </div>
    </>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const DocumentsTab = ({ agentId }) => {
  // docs: keyed by doc type, holds { status, path, publicUrl, uploadedAt, rejectionReason }
  const [docs,        setDocs]        = useState({});
  const [staged,      setStaged]      = useState({});   // { key: File }
  const [uploading,   setUploading]   = useState({});   // { key: bool }
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [globalError, setGlobalError] = useState('');
  const [successMsg,  setSuccessMsg]  = useState('');

  // ── Fetch existing doc metadata ──────────────────────────────────────────────
  const fetchDocs = useCallback(async () => {
    setLoadingDocs(true);
    setGlobalError('');
    try {
      const res = await fetch(`${API_BASE}/api/documents${agentId ? `?agentId=${agentId}` : ''}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = await res.json();
      // Expected shape: { success: true, data: { incorporation: { path, publicUrl, uploadedAt, status }, … } }
      if (json.success && json.data) {
        setDocs(json.data);
      } else {
        setDocs({});
      }
    } catch (err) {
      // Non-fatal — agent may have no docs yet
      setDocs({});
      if (err.message && !err.message.includes('404')) {
        setGlobalError('Could not load existing documents. You can still upload new ones.');
      }
    } finally {
      setLoadingDocs(false);
    }
  }, [agentId]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  // ── Stage a file for a given doc key ────────────────────────────────────────
  const handleFile = (key, file) => {
    setStaged(prev => ({ ...prev, [key]: file }));
    setGlobalError('');
    setSuccessMsg('');
  };

  const handleClearStaged = (key) => {
    setStaged(prev => { const next = { ...prev }; delete next[key]; return next; });
  };

  // ── Upload a single document ─────────────────────────────────────────────────
  const handleUpload = async (key) => {
    const file = staged[key];
    if (!file) return;

    setUploading(prev => ({ ...prev, [key]: true }));
    setGlobalError('');
    setSuccessMsg('');

    try {
      const formData = new FormData();
      if (agentId) formData.append('agentId', agentId);
      formData.append(key, file);

      const res = await fetch(`${API_BASE}/api/documents`, {
        method:      'POST',
        credentials: 'include',
        body:        formData,
        // Do NOT set Content-Type — browser sets multipart boundary automatically
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        throw new Error(json.error || `Upload failed (${res.status})`);
      }

      // Optimistically update local doc state
      setDocs(prev => ({
        ...prev,
        [key]: {
          ...(prev[key] || {}),
          path:       json.data?.[key] || prev[key]?.path,
          status:     'uploaded',
          uploadedAt: new Date().toISOString(),
        },
      }));

      // Clear staged file
      handleClearStaged(key);
      setSuccessMsg(`${DOC_TYPES.find(d => d.key === key)?.label} uploaded successfully.`);
      setTimeout(() => setSuccessMsg(''), 5000);
      // Refresh to get the presigned URL so View button works immediately
      fetchDocs();

    } catch (err) {
      setGlobalError(`Upload error: ${err.message}`);
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }));
    }
  };

  // ── Save Google Maps URL ────────────────────────────────────────────────────
  const handleSaveMapsUrl = async (url) => {
    const res = await fetch(`${API_BASE}/api/documents/office-location`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mapsUrl: url }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) throw new Error(json.error || 'Save failed');
    // Reflect saved URL in local docs state
    setDocs(prev => ({
      ...prev,
      office_photo: { ...(prev.office_photo || {}), mapsUrl: url },
    }));
  };

  // ─── render ─────────────────────────────────────────────────────────────────

  const enrichedDocs = DOC_TYPES.map(dt => ({
    ...dt,
    ...(docs[dt.key] || { status: 'none' }),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Document Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Upload your agency documents for verification. Supported formats: JPEG, PNG, WebP, PDF.
          </p>
        </div>
        <button
          onClick={fetchDocs}
          disabled={loadingDocs}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-600 font-medium"
        >
          <RefreshCw className={`h-4 w-4 ${loadingDocs ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Global messages */}
      {globalError && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{globalError}</p>
          <button onClick={() => setGlobalError('')} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm">{successMsg}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loadingDocs ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DOC_TYPES.map(dt => (
            <div key={dt.key} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 shadow-sm animate-pulse">
              <div className="h-4 w-3/4 bg-gray-200 rounded" />
              <div className="h-3 w-1/2 bg-gray-100 rounded" />
              <div className="h-20 bg-gray-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrichedDocs.map(doc => (
            <DocumentCard
              key={doc.key}
              doc={doc}
              staged={staged[doc.key] || null}
              onFile={handleFile}
              onClearStaged={handleClearStaged}
              onUpload={handleUpload}
              uploading={!!uploading[doc.key]}
              onMapsUrlSave={doc.key === 'office_photo' ? handleSaveMapsUrl : undefined}
            />
          ))}
        </div>
      )}

      {/* Info banner */}
      <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
        <FileText className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          All documents are reviewed by our compliance team within 1–2 business days.
          You will be notified once your documents are verified. Do not upload expired documents.
        </p>
      </div>
    </div>
  );
};
export default DocumentsTab;