import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';

const CreatePackageModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: "",
    duration: "",
    price: "",
    description: "",
    inclusions: [],
    exclusions: [],
    itinerary: [],
    images: [],
  });
  const [dragOver, setDragOver] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave?.(formData);
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto">

        {/* Accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Create New Package</h2>
            <p className="text-sm text-gray-500 mt-0.5">Fill in the details for your travel package</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="mx-6 bg-gray-100" />

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-2 space-y-4">

            {/* Package Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Package Name <span className="text-emerald-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Bali Adventure Escape"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder-gray-400"
                required
              />
            </div>

            {/* Duration + Price */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Duration <span className="text-emerald-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="e.g., 7 Days / 6 Nights"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder-gray-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Price (USD) <span className="text-emerald-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">$</span>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder-gray-400"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Description <span className="text-emerald-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="Describe the highlights and unique value of this package..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder-gray-400 resize-none"
                required
              />
            </div>

            {/* Upload Images */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Images</label>
              <label
                className={`flex flex-col items-center gap-2 border-2 border-dashed rounded-xl py-5 cursor-pointer transition-colors ${
                  dragOver ? "border-emerald-400 bg-emerald-50" : "border-gray-200 hover:border-emerald-300 hover:bg-gray-50"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
              >
                <div className="p-2 rounded-full bg-emerald-50">
                  <Upload className="h-5 w-5 text-emerald-500" />
                </div>
                <p className="text-sm text-gray-700">
                  Drop images here, or <span className="text-emerald-600 underline">browse</span>
                </p>
                <p className="text-xs text-gray-400">PNG, JPG, JPEG · max 10MB each</p>
                <input type="file" multiple accept="image/*" className="hidden" />
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between px-6 pb-6">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              Create Package
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePackageModal;