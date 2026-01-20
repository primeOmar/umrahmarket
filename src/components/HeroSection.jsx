import React from 'react';
import { Search, Calendar, Users, MapPin, Star, Shield, CheckCircle } from 'lucide-react';

const HeroSection = () => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-green-900 to-teal-900 text-white">
      {/* Enhanced Background with Particles */}
      <div className="absolute inset-0">
        {/* Animated gradient orb */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-800 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute top-1/3 -right-20 w-96 h-96 bg-teal-800 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Subtle pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        ></div>
      </div>
      
      <div className="relative container mx-auto px-4 py-16 lg:py-24">
        <div className="max-w-6xl mx-auto">
          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <div className="flex items-center bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
              <Shield className="h-4 w-4 text-emerald-300 mr-2" />
              <span className="text-sm">100% Verified Agencies</span>
            </div>
            <div className="flex items-center bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
              <Star className="h-4 w-4 text-amber-300 mr-2" />
              <span className="text-sm">5-Star Rated Packages</span>
            </div>
            <div className="flex items-center bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
              <CheckCircle className="h-4 w-4 text-green-300 mr-2" />
              <span className="text-sm">Best Price Guarantee</span>
            </div>
          </div>
          
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Your Spiritual
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 animate-gradient">
                Journey Awaits
              </span>
            </h1>
            <p className="text-lg md:text-xl text-emerald-100 max-w-3xl mx-auto mb-8 leading-relaxed">
              Discover <span className="font-semibold text-amber-300">verified Umrah packages</span> from trusted agencies worldwide. 
              Compare, book, and embark on your pilgrimage with complete confidence.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold py-3 px-8 rounded-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center">
                <Star className="h-5 w-5 mr-2" />
                Explore Top Packages
              </button>
              <button className="bg-white/10 backdrop-blur-sm border border-white/20 text-white font-bold py-3 px-8 rounded-lg hover:bg-white/20 transition-all duration-300">
                Watch Virtual Tour
              </button>
            </div>
          </div>

          {/* Enhanced Search Bar */}
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-1 mb-16 border border-white/20 shadow-2xl">
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-2xl">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Find Your Perfect Umrah Package</h3>
                <p className="text-gray-600">Search across 200+ verified agencies</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Destination */}
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Destination (Makkah & Madinah)"
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all group-hover:border-gray-300"
                  />
                </div>

                {/* Dates */}
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Select Dates"
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all group-hover:border-gray-300"
                  />
                </div>

                {/* Travelers */}
                <div className="relative group">
                  <Users className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                  <select className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all group-hover:border-gray-300 appearance-none cursor-pointer">
                    <option>2 Adults</option>
                    <option>1 Adult</option>
                    <option>Family (4+)</option>
                    <option>Group (10+)</option>
                    <option>Custom Group</option>
                  </select>
                </div>

                {/* Search Button */}
                <button className="bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold py-4 px-6 lg:px-8 rounded-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center group">
                  <Search className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                  <span className="group-hover:translate-x-0.5 transition-transform">Search Packages</span>
                </button>
              </div>
              
              {/* Quick Filters */}
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                <button className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm hover:bg-emerald-100 transition">
                  Ramadan 2024
                </button>
                <button className="px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm hover:bg-amber-100 transition">
                  Family Packages
                </button>
                <button className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100 transition">
                  Luxury 5-Star
                </button>
                <button className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm hover:bg-purple-100 transition">
                  Budget Friendly
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Stats with Icons */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            <div className="text-center p-6 bg-gradient-to-br from-white/5 to-transparent rounded-2xl backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all hover:scale-105">
              <div className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">200+</div>
              <p className="text-emerald-200 text-sm md:text-base">Verified Agencies</p>
              <div className="mt-3 w-12 h-1 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full mx-auto"></div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-white/5 to-transparent rounded-2xl backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all hover:scale-105">
              <div className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">5,000+</div>
              <p className="text-emerald-200 text-sm md:text-base">Successful Trips</p>
              <div className="mt-3 w-12 h-1 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full mx-auto"></div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-white/5 to-transparent rounded-2xl backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all hover:scale-105">
              <div className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">98%</div>
              <p className="text-emerald-200 text-sm md:text-base">Satisfaction Rate</p>
              <div className="mt-3 w-12 h-1 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full mx-auto"></div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-white/5 to-transparent rounded-2xl backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all hover:scale-105">
              <div className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">24/7</div>
              <p className="text-emerald-200 text-sm md:text-base">Support</p>
              <div className="mt-3 w-12 h-1 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent"></div>
     
      
      {/* Decorative Elements */}
      <div className="absolute -bottom-8 left-10 w-24 h-24 bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full mix-blend-multiply filter blur-2xl opacity-10"></div>
      <div className="absolute -bottom-12 right-10 w-32 h-32 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full mix-blend-multiply filter blur-2xl opacity-10"></div>
    </div>
  );
};

export default HeroSection;