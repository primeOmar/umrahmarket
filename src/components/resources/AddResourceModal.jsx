import React, { useState } from 'react';
import { FileText, X, Loader, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── API base (mirrors SuperAdminDashboard.jsx) ───────────────────────────
const _base = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5000';
const BASE_API = _base.endsWith('/api') ? _base : `${_base}/api`;

// Router is mounted as app.use('/api/resources', resourcesRoutes) and the
// router itself defines '/superadmin/resources' — so the real path is
// /api/resources/superadmin/resources, not /api/superadmin/resources.
const RESOURCES_ENDPOINT = '/resources';

const getToken = () => localStorage.getItem('superadmin_token');

// Plain authed fetch — deliberately does NOT set Content-Type so the
// browser can set the correct multipart boundary when body is FormData.
const authFetch = async (url, options = {}) => {
  const token = getToken();
  return fetch(`${BASE_API}${url}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
};

const asJson = async (res) => {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `HTTP ${res.status}`);
  }
  return res.json();
};

export const MAX_FILE_MB = 15;

// ═════════════════════════════════════════════════════════════════════════
// ADD RESOURCE MODAL — upload form only. Owns its own upload request;
// tells the parent when a resource was successfully added via onUploaded.
// ═════════════════════════════════════════════════════════════════════════
export const AddResourceModal = ({ onClose, onUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setFile(null);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
  };

  const closeModal = () => {
    if (uploading) return;
    resetForm();
    onClose();
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const isPdf = f.type === 'application/pdf';
    const isImage = f.type.startsWith('image/');
    if (!isPdf && !isImage) {
      toast.error('Only PDF or image files are allowed');
      return;
    }
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`File must be under ${MAX_FILE_MB}MB`);
      return;
    }
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFile(f);
    setFilePreview(isImage ? URL.createObjectURL(f) : null);
  };

  const handleUpload = async () => {
    if (!title.trim()) { toast.error('Please enter a title'); return; }
    if (!file) { toast.error('Please choose a PDF or image file'); return; }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('file', file);

      const res = await authFetch(RESOURCES_ENDPOINT, {
        method: 'POST',
        body: formData,
      });
      const data = await asJson(res);
      toast.success(data?.message || 'Resource uploaded');
      resetForm();
      onUploaded?.(data?.resource || data?.data || null);
      onClose();
    } catch (e) {
      toast.error(e.message || 'Failed to upload resource');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && closeModal()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Add Resource</h2>
          <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[calc(90vh-5rem)] space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Umrah Package Pamphlet 2026"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional short description shown to visitors"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File <span className="text-red-500">*</span>
            </label>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors">
              <Upload className="h-6 w-6 text-gray-400" />
              <span className="text-sm text-gray-500">
                {file ? file.name : 'Click to choose a PDF or image'}
              </span>
              <span className="text-xs text-gray-400">PDF, JPG or PNG, up to {MAX_FILE_MB}MB</span>
              <input type="file" accept="application/pdf,image/*" onChange={handleFileChange} className="hidden" />
            </label>
            {filePreview && (
              <img src={filePreview} alt="Preview" className="mt-3 h-32 w-full object-cover rounded-lg border border-gray-200" />
            )}
            {file && !filePreview && (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                <FileText className="h-4 w-4 text-red-400" /> {file.name}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={closeModal}
              disabled={uploading}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading && <Loader className="h-4 w-4 animate-spin" />} Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddResourceModal;