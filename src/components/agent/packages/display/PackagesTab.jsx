import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit, Copy, Trash2, Star, Users, MapPin, Clock,
  Search, Grid, List, Tag, Globe, ChevronRight,
  MoreVertical, AlertCircle, Loader2, RefreshCw,
  Package, TrendingUp, Calendar, DollarSign
} from 'lucide-react';
import { getAgentPackages, deletePackage } from '../services/packagesApi';
import PackagePreviewModal from '../creation/PackagePreviewModal';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fallbackImage =
  'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?auto=format&fit=crop&w=800&q=80';

const statusColor = (status = '') => {
  const s = status.toLowerCase();
  if (s === 'active') return 'bg-emerald-500/90 text-white';
  return 'bg-gray-400/80 text-white';
};

// ─────────────────────────────────────────────────────────────────────────────
// PackageCard
// ─────────────────────────────────────────────────────────────────────────────
export const PackageCard = ({ pkg, onEdit, onDuplicate, onDelete, onPreview }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const close = () => setShowMenu(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [showMenu]);

  // Resolve image: first entry from image_urls array, or legacy .image field
  const imageSrc = imgError
    ? fallbackImage
    : (Array.isArray(pkg.image_urls) && pkg.image_urls[0]) || pkg.image || fallbackImage;

  const price = Number(pkg.price ?? 0);
  const rating = Number(pkg.makkah_hotel_rating ?? pkg.rating ?? 0);
  const duration = pkg.duration ? `${pkg.duration} days` : (pkg.durationLabel ?? '');
  const bookings = pkg.bookings ?? 0;
  const inclusions = Array.isArray(pkg.inclusions) ? pkg.inclusions : [];

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 border border-gray-100 group">
      {/* ── Image ── */}
      <div className="relative h-52 overflow-hidden">
        <img
          src={imageSrc}
          alt={pkg.name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Status + menu */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${statusColor(pkg.status)}`}>
            ● {pkg.status ?? 'Unknown'}
          </span>

          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="p-1.5 bg-black/30 backdrop-blur-sm hover:bg-black/50 rounded-lg transition-colors"
            >
              <MoreVertical className="h-4 w-4 text-white" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20">
                <button
                  onClick={() => { onEdit(pkg); setShowMenu(false); }}
                  className="w-full flex items-center space-x-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  <Edit className="h-4 w-4" /><span>Edit</span>
                </button>
                <button
                  onClick={() => { onDuplicate(pkg); setShowMenu(false); }}
                  className="w-full flex items-center space-x-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                >
                  <Copy className="h-4 w-4" /><span>Duplicate</span>
                </button>
                <button
                  onClick={() => { onDelete(pkg); setShowMenu(false); }}
                  className="w-full flex items-center space-x-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" /><span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Price + rating */}
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div>
            <p className="text-white/70 text-xs mb-0.5">Starting from</p>
            <p className="text-white text-2xl font-bold">${price.toLocaleString()}</p>
            <p className="text-white/70 text-xs">per person</p>
          </div>
          {rating > 0 && (
            <div className="flex items-center space-x-1 bg-amber-400/90 backdrop-blur-sm px-2.5 py-1 rounded-full">
              <Star className="h-3.5 w-3.5 text-white fill-current" />
              <span className="text-white text-xs font-semibold">{rating}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="p-5">
        <div className="mb-3">
          <h4 className="font-bold text-gray-900 text-lg leading-tight mb-1">{pkg.name}</h4>
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-sm text-gray-500">
            {duration && (
              <div className="flex items-center space-x-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{duration}</span>
              </div>
            )}
            {pkg.location && (
              <>
                <span className="text-gray-200">•</span>
                <div className="flex items-center space-x-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="capitalize">{pkg.location}</span>
                </div>
              </>
            )}
            {bookings > 0 && (
              <>
                <span className="text-gray-200">•</span>
                <div className="flex items-center space-x-1">
                  <Users className="h-3.5 w-3.5" />
                  <span>{bookings}+ booked</span>
                </div>
              </>
            )}
          </div>
        </div>

        {pkg.description && (
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-4">{pkg.description}</p>
        )}

        {inclusions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {inclusions.slice(0, 3).map((tag, i) => (
              <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-full border border-emerald-100">
                {tag}
              </span>
            ))}
            {inclusions.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-50 text-gray-500 text-xs rounded-full border border-gray-100">
                +{inclusions.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onEdit(pkg)}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Edit className="h-3.5 w-3.5" /><span>Edit</span>
            </button>
            <button
              onClick={() => onDuplicate(pkg)}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <Copy className="h-3.5 w-3.5" /><span>Duplicate</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => onPreview(pkg)}
            className="flex items-center space-x-1 text-sm text-emerald-600 font-medium hover:text-emerald-700 group/link"
          >
            <span>Details</span>
            <ChevronRight className="h-4 w-4 group-hover/link:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Delete Confirmation Modal
// ─────────────────────────────────────────────────────────────────────────────
const DeleteModal = ({ pkg, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-red-100 rounded-full">
          <Trash2 className="h-5 w-5 text-red-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Delete Package</h3>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        Are you sure you want to delete <span className="font-semibold text-gray-900">"{pkg.name}"</span>?
        This action cannot be undone.
      </p>
      <div className="flex space-x-3">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          <span>{loading ? 'Deleting…' : 'Delete'}</span>
        </button>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// PackagesTab
// ─────────────────────────────────────────────────────────────────────────────
const PackagesTab = ({ onCreatePackage, onEditPackage, onDuplicatePackage, refreshKey, onPackageDeleted }) => {
  const [packages, setPackages]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter]   = useState('all');
  const [viewMode, setViewMode]       = useState('grid');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [previewTarget, setPreviewTarget] = useState(null);

  // ── Fetch agent's packages ──────────────────────────────────────────────────
  const fetchPackages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAgentPackages();
      // API may return { packages: [...] } or { data: [...] } or plain array
      const list = Array.isArray(data)
        ? data
        : (data.packages ?? data.data ?? []);
      setPackages(list);
    } catch (err) {
      setError(err.message || 'Failed to load packages.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPackages(); }, [fetchPackages, refreshKey]);

  // ── Delete handler ──────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deletePackage(deleteTarget.id);
      setPackages((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      onPackageDeleted?.(deleteTarget);
      setDeleteTarget(null);
    } catch (err) {
      alert(err.message || 'Failed to delete package.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Derived stats ───────────────────────────────────────────────────────────
  const activeCount   = packages.filter((p) => p.status?.toLowerCase() === 'active').length;
  const inactiveCount = packages.length - activeCount;
  const totalBookings = packages.reduce((a, p) => a + (p.bookings ?? 0), 0);
  const avgRating     = packages.length
    ? (packages.reduce((a, p) => a + Number(p.makkah_hotel_rating ?? p.rating ?? 0), 0) / packages.length).toFixed(1)
    : '—';

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filteredPackages = packages.filter((pkg) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      pkg.name?.toLowerCase().includes(q) ||
      pkg.description?.toLowerCase().includes(q) ||
      pkg.location?.toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === 'all' || pkg.status?.toLowerCase() === statusFilter;
    const matchesType =
      typeFilter === 'all' || pkg.type?.toLowerCase() === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Packages</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {packages.length} total · {activeCount} active · {inactiveCount} inactive
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchPackages}
            disabled={loading}
            className="p-2 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onCreatePackage}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all font-medium text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Create Package</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Packages', value: packages.length, icon: Package,     color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Active',         value: activeCount,     icon: TrendingUp,  color: 'text-emerald-600',bg: 'bg-emerald-50'},
          { label: 'Total Bookings', value: totalBookings > 0 ? `${totalBookings}+` : '—', icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Avg. Rating',    value: avgRating,       icon: Star,        color: 'text-amber-600',  bg: 'bg-amber-50'  },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center space-x-3">
            <div className={`p-2.5 rounded-lg ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{loading ? '…' : value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search packages…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Types</option>
          <option value="umrah">Umrah</option>
          <option value="hajj">Hajj</option>
        </select>

        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden ml-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Loader2 className="h-10 w-10 animate-spin mb-4 text-emerald-500" />
          <p className="text-sm">Loading your packages…</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-red-700 mb-1">Failed to load packages</p>
          <p className="text-xs text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchPackages}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" /><span>Retry</span>
          </button>
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Tag className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No packages found</h3>
          <p className="text-sm text-gray-500 mb-6">
            {searchQuery
              ? `No results for "${searchQuery}"`
              : 'Get started by creating your first travel package.'}
          </p>
          {!searchQuery && (
            <button
              onClick={onCreatePackage}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg transition-all font-medium text-sm"
            >
              <Plus className="h-4 w-4" /><span>Create Package</span>
            </button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-1 lg:grid-cols-2 gap-6'
          : 'flex flex-col space-y-4'
        }>
          {filteredPackages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              onEdit={onEditPackage}
              onDuplicate={onDuplicatePackage}
              onDelete={(p) => setDeleteTarget(p)}
              onPreview={(p) => setPreviewTarget(p)}
            />
          ))}
        </div>
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <DeleteModal
          pkg={deleteTarget}
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Read-only preview — no booking/payment, agents can't book their own packages */}
      {previewTarget && (
        <PackagePreviewModal
          pkg={previewTarget}
          onClose={() => setPreviewTarget(null)}
          onEdit={onEditPackage}
        />
      )}
    </div>
  );
};

export default PackagesTab;