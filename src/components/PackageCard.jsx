import React from 'react';
import { Star, Calendar, Users, MapPin, Check, Heart, Shield } from 'lucide-react';

const PackageCard = ({ pkg, isFavorite, onToggleFavorite }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getMonthName = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long' });
  };

  return (
    <div className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
      {/* Image Section */}
      <div className="relative h-56 overflow-hidden">
        <img 
          src={pkg.image} 
          alt={pkg.packageName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {pkg.featured && (
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
              FEATURED
            </span>
          )}
          <span className="bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-1 rounded-full text-xs font-semibold">
            {getMonthName(pkg.dates)}
          </span>
        </div>
        
        {/* Favorite Button */}
        <button 
          onClick={() => onToggleFavorite(pkg.id)}
          className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white transition"
        >
          <Heart 
            className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} 
          />
        </button>
        
        {/* Price */}
        <div className="absolute bottom-4 left-4">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-xl shadow-lg">
            <div className="text-sm">Starting from</div>
            <div className="text-2xl font-bold">${pkg.price}</div>
          </div>
        </div>
        
        {/* Available Seats */}
        <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
          {pkg.availableSeats} seats left
        </div>
      </div>
      
      {/* Content Section */}
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{pkg.agencyLogo}</span>
              <h3 className="text-lg font-bold text-gray-900">{pkg.packageName}</h3>
              {pkg.verified && (
                <Shield className="h-4 w-4 text-green-600" title="Verified Agency" />
              )}
            </div>
            <p className="text-gray-600 text-sm">{pkg.agencyName}</p>
          </div>
          
          {/* Rating */}
          <div className="flex items-center bg-amber-50 px-2 py-1 rounded-lg">
            <Star className="h-4 w-4 text-amber-500 fill-current" />
            <span className="font-bold ml-1">{pkg.rating}</span>
            <span className="text-gray-500 text-sm ml-1">({pkg.reviews})</span>
          </div>
        </div>
        
        {/* Details */}
        <div className="flex items-center gap-4 text-gray-600 text-sm mb-4">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            {formatDate(pkg.dates)}
          </div>
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-1" />
            {pkg.duration}
          </div>
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-1" />
            {pkg.distanceToHaram} to Haram
          </div>
        </div>
        
        {/* Hotel Stars */}
        <div className="flex items-center mb-4">
          <div className="flex">
            {[...Array(pkg.hotelStars)].map((_, i) => (
              <Star key={i} className="h-4 w-4 text-amber-400 fill-current" />
            ))}
          </div>
          <span className="text-sm text-gray-600 ml-2">
            {pkg.hotelStars}-star hotel
          </span>
        </div>
        
        {/* Includes */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Includes:</h4>
          <div className="flex flex-wrap gap-2">
            {pkg.includes.slice(0, 3).map((item, index) => (
              <span 
                key={index}
                className="inline-flex items-center text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full"
              >
                <Check className="h-3 w-3 mr-1" />
                {item}
              </span>
            ))}
            {pkg.includes.length > 3 && (
              <span className="text-xs text-gray-500">
                +{pkg.includes.length - 3} more
              </span>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3">
          <button className="flex-1 bg-gray-100 text-gray-800 font-semibold py-3 rounded-lg hover:bg-gray-200 transition">
            View Details
          </button>
          <button className="flex-1 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-semibold py-3 rounded-lg hover:shadow-lg transition">
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default PackageCard;