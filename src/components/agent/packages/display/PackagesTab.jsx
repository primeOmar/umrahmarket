import React, { useState } from 'react';
import {
  Plus, Edit, Copy, Trash2, Star, Users, MapPin, Clock,
  Filter, Search, Grid, List, TrendingUp, Eye, MoreVertical,
  CheckCircle, XCircle, Tag, Globe, ChevronRight
} from 'lucide-react';

// ==================== PACKAGE CARD COMPONENT ====================
export const PackageCard = ({ pkg, onEdit, onDuplicate, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [imgError, setImgError] = useState(false);

  const fallbackImage = `https://images.unsplash.com/photo-1564769662533-4f00a87b4056?auto=format&fit=crop&w=800&q=80`;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-400 border border-gray-100 group">
      {/* Image */}
      <div className="relative h-52 overflow-hidden">
        <img
          src={imgError ? fallbackImage : pkg.image}
          alt={pkg.name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Top badges */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${
            pkg.status === 'active'
              ? 'bg-emerald-500/90 text-white'
              : 'bg-gray-500/80 text-white'
          }`}>
            {pkg.status === 'active' ? '● Active' : '● Inactive'}
          </span>

          {/* 3-dot menu */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="p-1.5 bg-black/30 backdrop-blur-sm hover:bg-black/50 rounded-lg transition-colors"
            >
              <MoreVertical className="h-4 w-4 text-white" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-10">
                <button
                  onClick={() => { onEdit(pkg); setShowMenu(false); }}
                  className="w-full flex items-center space-x-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => { onDuplicate(pkg); setShowMenu(false); }}
                  className="w-full flex items-center space-x-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                  <span>Duplicate</span>
                </button>
                <button
                  onClick={() => { onDelete(pkg); setShowMenu(false); }}
                  className="w-full flex items-center space-x-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom price overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div>
            <p className="text-white/70 text-xs mb-0.5">Starting from</p>
            <p className="text-white text-2xl font-bold">${pkg.price.toLocaleString()}</p>
            <p className="text-white/70 text-xs">per person</p>
          </div>
          <div className="flex items-center space-x-1 bg-amber-400/90 backdrop-blur-sm px-2.5 py-1 rounded-full">
            <Star className="h-3.5 w-3.5 text-white fill-current" />
            <span className="text-white text-xs font-semibold">{pkg.rating}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="mb-3">
          <h4 className="font-bold text-gray-900 text-lg leading-tight mb-1">{pkg.name}</h4>
          <div className="flex items-center space-x-3 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{pkg.duration}</span>
            </div>
            <span className="text-gray-200">•</span>
            <div className="flex items-center space-x-1">
              <Users className="h-3.5 w-3.5" />
              <span>{pkg.bookings}+ booked</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-4">{pkg.description}</p>

        {/* Inclusions (optional tags) */}
        {pkg.inclusions && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {pkg.inclusions.slice(0, 3).map((tag, i) => (
              <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-full border border-emerald-100">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex space-x-1.5">
            <button
              onClick={() => onEdit(pkg)}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => onDuplicate(pkg)}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Duplicate</span>
            </button>
          </div>
          <button className="flex items-center space-x-1 text-sm text-emerald-600 font-medium hover:text-emerald-700 group/link">
            <span>Details</span>
            <ChevronRight className="h-4 w-4 group-hover/link:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== PACKAGES TAB COMPONENT ====================
const PackagesTab = ({ packages = [], onCreatePackage, onEditPackage, onDuplicatePackage, onDeletePackage }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  const filteredPackages = packages.filter((pkg) => {
    const matchesSearch =
      pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkg.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || pkg.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = packages.filter((p) => p.status === 'active').length;
  const inactiveCount = packages.filter((p) => p.status !== 'active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Travel Packages</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {packages.length} total · {activeCount} active · {inactiveCount} inactive
          </p>
        </div>
        <button
          onClick={onCreatePackage}
          className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all font-medium"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm">Create Package</span>
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Packages', value: packages.length, icon: Globe, color: 'text-blue-600 bg-blue-50' },
          { label: 'Total Bookings', value: packages.reduce((a, p) => a + (p.bookings || 0), 0) + '+', icon: Users, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Avg. Rating', value: packages.length ? (packages.reduce((a, p) => a + (p.rating || 0), 0) / packages.length).toFixed(1) : '—', icon: Star, color: 'text-amber-600 bg-amber-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center space-x-3">
            <div className={`p-2.5 rounded-lg ${color.split(' ')[1]}`}>
              <Icon className={`h-5 w-5 ${color.split(' ')[0]}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex items-center space-x-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search packages..."
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

        {/* View toggle */}
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-400 hover:bg-gray-50'} transition-colors`}
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-400 hover:bg-gray-50'} transition-colors`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Package Grid / List */}
      {filteredPackages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Tag className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No packages found</h3>
          <p className="text-sm text-gray-500 mb-6">
            {searchQuery ? `No results for "${searchQuery}"` : 'Get started by creating your first travel package.'}
          </p>
          {!searchQuery && (
            <button
              onClick={onCreatePackage}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg transition-all font-medium text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Create Package</span>
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
              onDelete={onDeletePackage}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PackagesTab;