import React, { useState } from 'react';
import { Search, Calendar, ChevronDown, Hotel, MapPin } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const HeroSection = () => {
  const [checkInLocation, setCheckInLocation] = useState('Makkah');
  const [checkOutLocation, setCheckOutLocation] = useState('Madinah');
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const locations = [
    { value: 'makkah', label: 'Makkah', icon: '🕋' },
    { value: 'madinah', label: 'Madinah', icon: '🕌' },
  ];

  const formatDate = (date) => {
    if (!date) return 'Select Date';
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleSearch = () => {
    const searchData = {
      checkIn: checkInLocation,
      checkOut: checkOutLocation,
      date: formatDate(selectedDate)
    };
    console.log('Searching packages:', searchData);
    alert(`Searching packages for ${checkInLocation} to ${checkOutLocation} on ${formatDate(selectedDate)}`);
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-green-900 to-teal-900 text-white">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-800 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute top-1/3 -right-20 w-96 h-96 bg-teal-800 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>
      
      <div className="relative container mx-auto px-4 py-16 lg:py-24">
        <div className="max-w-6xl mx-auto">
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
          </div>

          {/* SIMPLIFIED SEARCH SECTION - 3 ELEMENTS ONLY */}
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-1 mb-16 border border-white/20 shadow-2xl">
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-2xl">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Find Your Perfect Umrah Package</h3>
                <p className="text-gray-600">Search across 200+ verified agencies</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                {/* Check-in Location */}
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Check-in Location
                  </label>
                  <div className="relative">
                    <Hotel className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <select
                      value={checkInLocation}
                      onChange={(e) => setCheckInLocation(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 appearance-none cursor-pointer bg-white"
                    >
                      <option value="makkah">🕋 Makkah</option>
                      <option value="madinah">🕌 Madinah</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Where your journey begins</p>
                </div>

                {/* Check-out Location */}
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Check-out Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <select
                      value={checkOutLocation}
                      onChange={(e) => setCheckOutLocation(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 appearance-none cursor-pointer bg-white"
                    >
                      <option value="madinah">🕌 Madinah</option>
                      <option value="makkah">🕋 Makkah</option>
                      <option value="both">🕌🕋 Makkah & Madinah</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Where your journey ends</p>
                </div>

                {/* Date Selection */}
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departure Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      readOnly
                      value={formatDate(selectedDate)}
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 cursor-pointer bg-white"
                    />
                    {showDatePicker && (
                      <div className="absolute z-50 mt-2">
                        <DatePicker
                          selected={selectedDate}
                          onChange={(date) => {
                            setSelectedDate(date);
                            setShowDatePicker(false);
                          }}
                          inline
                          minDate={new Date()}
                          calendarClassName="bg-white rounded-lg shadow-xl border-2 border-gray-200 p-4"
                          showMonthDropdown
                          showYearDropdown
                          dropdownMode="select"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">When you want to travel</p>
                </div>

                {/* Search Button */}
                <div className="md:col-span-1">
                  <button
                    onClick={handleSearch}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold py-3 px-4 rounded-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center group"
                    title="Search Packages"
                  >
                    <Search className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Quick Date Presets */}
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                <button 
                  onClick={() => setSelectedDate(new Date())}
                  className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm hover:bg-emerald-100 transition flex items-center"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Today
                </button>
                <button 
                  onClick={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    setSelectedDate(tomorrow);
                  }}
                  className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100 transition flex items-center"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Tomorrow
                </button>
                <button 
                  onClick={() => {
                    const nextWeek = new Date();
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    setSelectedDate(nextWeek);
                  }}
                  className="px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm hover:bg-amber-100 transition flex items-center"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Next Week
                </button>
                <button 
                  onClick={() => {
                    // Set date to Ramadan 2024 start (example: March 10, 2024)
                    setSelectedDate(new Date(2024, 2, 10));
                  }}
                  className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm hover:bg-purple-100 transition flex items-center"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Ramadan 2024
                </button>
              </div>

              {/* Selected Options Display */}
              {(checkInLocation || checkOutLocation || selectedDate) && (
                <div className="mt-4 p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-100">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-medium text-emerald-800">Selected:</span>
                    {checkInLocation && (
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full flex items-center">
                        <Hotel className="h-3 w-3 mr-1" />
                        Check-in: {checkInLocation === 'makkah' ? '🕋 Makkah' : checkInLocation === 'madinah' ? '🕌 Madinah' : '🕌🕋 Both'}
                      </span>
                    )}
                    {checkOutLocation && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        Check-out: {checkOutLocation === 'madinah' ? '🕌 Madinah' : checkOutLocation === 'makkah' ? '🕋 Makkah' : '🕌🕋 Both'}
                      </span>
                    )}
                    {selectedDate && (
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(selectedDate)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            <div className="text-center p-6 bg-gradient-to-br from-white/5 to-transparent rounded-2xl backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all hover:scale-105">
              <div className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">200+</div>
              <p className="text-emerald-200 text-sm md:text-base">Verified Agencies</p>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-white/5 to-transparent rounded-2xl backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all hover:scale-105">
              <div className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">5,000+</div>
              <p className="text-emerald-200 text-sm md:text-base">Successful Trips</p>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-white/5 to-transparent rounded-2xl backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all hover:scale-105">
              <div className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">98%</div>
              <p className="text-emerald-200 text-sm md:text-base">Satisfaction Rate</p>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-white/5 to-transparent rounded-2xl backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all hover:scale-105">
              <div className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">24/7</div>
              <p className="text-emerald-200 text-sm md:text-base">Support</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent"></div>
    </div>
  );
};

export default HeroSection;