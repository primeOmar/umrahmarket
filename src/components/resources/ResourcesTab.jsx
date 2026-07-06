import React, { useEffect, useState, useCallback } from 'react';
import { Plus, FileText, Trash2, Loader, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { AddResourceModal } from './AddResourceModal';

// ─── API base (mirrors SuperAdminDashboard.jsx / AddResourceModal.jsx) ────
const _base = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5000';
const BASE_API = _base.endsWith('/api') ? _base : `${_base}/api`;

// Router is mounted as app.use('/api/resources', resourcesRoutes) and the
// router itself defines '/superadmin/resources' — so the real path is
// /api/resources/superadmin/resources.
const RESOURCES_ENDPOINT = '/resources/superadmin/resources';

const getToken = () => localStorage.getItem('superadmin_token');

const authFetch = async (url, options = {}) => {
  const token = getToken();
  return fetch(`${BASE_API}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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

// Normalize whatever shape getResources/createResource return into a
// consistent card model. Adjust the field names here if your controller
// uses different keys (e.g. file_url instead of fileUrl).
const normalizeResource = (r) => ({
  id: r.id,
  title: r.title,
  description: r.description || '',
  fileType: r.fileType || r.file_type || (r.url || r.fileUrl || '').toLowerCase().endsWith('.pdf') ? 'pdf' : 'image',
  url: r.url || r.fileUrl || r.file_url,
  createdAt: r.createdAt || r.created_at,
});

export const ResourcesTab = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(RESOURCES_ENDPOINT, { method: 'GET' });
      const data = await asJson(res);
      const list = data?.resources || data?.data || (Array.isArray(data) ? data : []);
      setResources(list.map(normalizeResource));
    } catch (e) {
      toast.error(e.message || 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleDelete = async (resource) => {
    if (!window.confirm(`Delete "${resource.title}"? This removes it from the public site.`)) return;
    setDeletingId(resource.id);
    try {
      const res = await authFetch(`${RESOURCES_ENDPOINT}/${resource.id}`, { method: 'DELETE' });
      await asJson(res);
      setResources(prev => prev.filter(r => r.id !== resource.id));
      toast.success('Resource deleted');
    } catch (e) {
      toast.error(e.message || 'Failed to delete resource');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUploaded = (created) => {
    if (created) {
      setResources(prev => [normalizeResource(created), ...prev]);
    } else {
      // Fallback: controller didn't return the created row, just refetch.
      fetchResources();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resources</h1>
          <p className="text-sm text-gray-500 mt-1">Pamphlets and images shown to the public</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Resource
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 flex items-center justify-center">
          <Loader className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : resources.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <p className="text-sm text-gray-400">No resources uploaded yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map(r => {
            const isPdf = r.fileType === 'pdf';
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-36 bg-gray-50 flex items-center justify-center border-b border-gray-100">
                  {isPdf ? (
                    <FileText className="h-10 w-10 text-red-400" />
                  ) : (
                    <img src={r.url} alt={r.title} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="p-4">
                  <p className="font-medium text-gray-900 text-sm truncate">{r.title}</p>
                  {r.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {r.createdAt ? format(new Date(r.createdAt), 'MMM d, yyyy') : '—'}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> View
                    </a>
                    <button
                      onClick={() => handleDelete(r)}
                      disabled={deletingId === r.id}
                      className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      {deletingId === r.id ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <AddResourceModal
          onClose={() => setShowAddModal(false)}
          onUploaded={handleUploaded}
        />
      )}
    </div>
  );
};

export default ResourcesTab;