import React from 'react';
import { X, MapPin, ExternalLink, AlertCircle } from 'lucide-react';

/**
 * OfficeLocationModal — View agent office location on Google Maps
 * 
 * Displays:
 *  - Embedded Google Maps iframe if a valid Google Maps URL is saved
 *  - Office photo gallery preview
 *  - Open in Google Maps button
 *  - Message if no location has been set yet
 */

const OfficeLocationModal = ({ agent, mapsUrl, officePhotos, onClose }) => {
  if (!agent) return null;

  // Extract embed URL from different Google Maps URL formats
  const getEmbedUrl = (url) => {
    if (!url) return null;
    
    // Already an embed URL
    if (url.includes('embed?pb=')) return url;
    
    // Short URL (maps.app.goo.gl)
    if (url.includes('maps.app.goo.gl')) {
      return `https://www.google.com/maps/embed?pb=${encodeURIComponent(url)}`;
    }
    
    // Standard Google Maps URL - extract coordinates if possible
    if (url.includes('google.com/maps')) {
      // Try to extract coordinates from URL like ?q=40.7128,-74.0060
      const qMatch = url.match(/[?&]q=([^&]+)/);
      if (qMatch) {
        const coords = qMatch[1];
        return `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3024.2219901290355!2d${coords}!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0:0x0!2z${encodeURIComponent(coords)}`;
      }
      // Fallback: wrap in iframe src
      return url.replace(/\/maps\//, '/maps/embed/');
    }
    
    return `https://www.google.com/maps/embed?pb=${encodeURIComponent(url)}`;
  };

  const embedUrl = getEmbedUrl(mapsUrl);
  const hasLocation = !!mapsUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Office Location</h2>
              <p className="text-xs text-gray-500 mt-0.5">{agent?.agencyName || 'Agency'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/70 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Map section */}
          {hasLocation ? (
            <div className="aspect-video w-full bg-gray-100">
              <iframe
                src={embedUrl || mapsUrl}
                width="100%"
                height="100%"
                style={{ border: 0, display: 'block' }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Office Location Map"
              />
            </div>
          ) : (
            <div className="aspect-video w-full bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-6">
              <MapPin className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-sm font-semibold text-gray-600 text-center">No location saved yet</p>
              <p className="text-xs text-gray-500 text-center mt-1.5">
                Visit the Documents tab and add your Google Maps link to display the office location here.
              </p>
            </div>
          )}

          {/* Details section */}
          <div className="p-6 space-y-5 border-t border-gray-100">
            
            {/* Location info */}
            {hasLocation && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-emerald-900">Location Saved</p>
                    <p className="text-xs text-emerald-700 mt-1 break-all">
                      {mapsUrl.length > 60 ? `${mapsUrl.substring(0, 60)}…` : mapsUrl}
                    </p>
                    <div className="flex gap-2 mt-2.5">
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" /> Open in Google Maps
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Office photos section */}
            {officePhotos && officePhotos.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>📸</span> Office Photos ({officePhotos.length})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {officePhotos.map((photo, idx) => (
                    <a
                      key={idx}
                      href={photo.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative overflow-hidden rounded-lg bg-gray-100 aspect-square hover:shadow-lg transition-shadow"
                    >
                      <img
                        src={photo.publicUrl}
                        alt={`Office ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="h-5 w-5 text-white drop-shadow-lg" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Agency info card */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wide mb-2.5">Agency Details</p>
              <div className="space-y-2">
                {[
                  ['Agency Name', agent?.agencyName],
                  ['License Number', agent?.licenseNumber],
                  ['Email', agent?.email],
                  ['Phone', agent?.phone],
                ].map(([label, value]) => (
                  value && (
                    <div key={label} className="flex justify-between items-start text-xs">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-medium text-gray-900 text-right max-w-[50%] truncate">{value}</span>
                    </div>
                  )
                ))}
              </div>
            </div>

            {/* Verification info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-blue-900">Office Location Verified</p>
                  <p className="text-[11px] text-blue-700 mt-1">
                    Your office location and photos have been submitted for verification. The admin team will review and confirm your location.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-gray-500">
            Location data last updated: {new Date().toLocaleDateString('en-GB')}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-200 hover:bg-gray-300 text-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfficeLocationModal;
