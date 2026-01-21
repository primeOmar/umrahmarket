import React, { useState } from 'react';
import { Search, Calendar, Users, MapPin, ChevronDown, Hotel, Plane } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const HeroSection = () => {
  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);
  const [departureCity, setDepartureCity] = useState('');
  const [destination, setDestination] = useState('Makkah & Madinah');
  const [travelers, setTravelers] = useState('2 Adults');
  const [showCheckInCalendar, setShowCheckInCalendar] = useState(false);
  const [showCheckOutCalendar, setShowCheckOutCalendar] = useState(false);

  const destinations = [
    { value: 'both', label: 'Makkah & Madinah', icon: '🕌' },
    { value: 'makkah', label: 'Makkah Only', icon: '🕋' },
    { value: 'madinah', label: 'Madinah Only', icon: '🕌' },
    { value: 'both-plus', label: 'Makkah + Madinah + Other Cities', icon: '✈️' },
  ];

  const departureCities = [
    'Select Departure City',
    'Riyadh, Saudi Arabia',
    'Jeddah, Saudi Arabia',
    'Dubai, UAE',
    'Abu Dhabi, UAE',
    'Doha, Qatar',
    'Kuwait City, Kuwait',
    'Muscat, Oman',
    'London, UK',
    'New York, USA',
    'Toronto, Canada',
    'Istanbul, Turkey',
    'Kuala Lumpur, Malaysia',
    'Jakarta, Indonesia',
    'Lahore, Pakistan',
    'Delhi, India',
    'Dhaka, Bangladesh'
  ];

  const travelerOptions = [
    '1 Adult',
    '2 Adults',
    '3 Adults',
    '4 Adults',
    'Family (2 Adults + 2 Children)',
    'Family (2 Adults + 3 Children)',
    'Group (6-10 People)',
    'Group (11-20 People)',
    'Group (20+ People)',
    'Custom Group'
  ];

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleSearch = () => {
    const searchData = {
      destination,
      departureCity,
      checkIn: formatDate(checkInDate),
      checkOut: formatDate(checkOutDate),
      travelers
    };
    console.log('Searching packages:', searchData);
    // Here you would typically navigate to search results or call an API
    alert(`Searching for ${travelers} traveling to ${destination} from ${departureCity}`);
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-green-900 to-teal-900 text-white">
      {/* Background elements remain the same */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-800 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute top-1/3 -right-20 w-96 h-96 bg-teal-800 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>
      
      <div className="relative container mx-auto px-4 py-16 lg:py-24">
        <div className="max-w-6xl mx-auto">
          {/* Header content remains the same */}
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

          {/* UPDATED SEARCH SECTION */}
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-1 mb-16 border border-white/20 shadow-2xl">
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-2xl">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Find Your Perfect Umrah Package</h3>
                <p className="text-gray-600">Search across 200+ verified agencies</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Destination Dropdown */}
                <div className="lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <select
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 appearance-none cursor-pointer bg-white"
                    >
                      {destinations.map((dest) => (
                        <option key={dest.value} value={dest.label}>
                          {dest.icon} {dest.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                {/* Departure City */}
                <div className="lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departure From
                  </label>
                  <div className="relative">
                    <Plane className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <select
                      value={departureCity}
                      onChange={(e) => setDepartureCity(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 appearance-none cursor-pointer bg-white"
                    >
                      {departureCities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                {/* Check-in Date */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Check-in Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      readOnly
                      value={formatDate(checkInDate) || 'Select Date'}
                      onClick={() => {
                        setShowCheckInCalendar(true);
                        setShowCheckOutCalendar(false);
                      }}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 cursor-pointer bg-white"
                    />
                    {showCheckInCalendar && (
                      <div className="absolute z-50 mt-1">
                        <DatePicker
                          selected={checkInDate}
                          onChange={(date) => {
                            setCheckInDate(date);
                            setShowCheckInCalendar(false);
                          }}
                          inline
                          minDate={new Date()}
                          calendarClassName="bg-white rounded-lg shadow-lg border p-2"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Check-out Date */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Check-out Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      readOnly
                      value={formatDate(checkOutDate) || 'Select Date'}
                      onClick={() => {
                        setShowCheckOutCalendar(true);
                        setShowCheckInCalendar(false);
                      }}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 cursor-pointer bg-white"
                    />
                    {showCheckOutCalendar && (
                      <div className="absolute z-50 mt-1">
                        <DatePicker
                          selected={checkOutDate}
                          onChange={(date) => {
                            setCheckOutDate(date);
                            setShowCheckOutCalendar(false);
                          }}
                          inline
                          minDate={checkInDate || new Date()}
                          calendarClassName="bg-white rounded-lg shadow-lg border p-2"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Travelers */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Travelers
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <select
                      value={travelers}
                      onChange={(e) => setTravelers(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 appearance-none cursor-pointer bg-white"
                    >
                      {travelerOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                {/* Search Button */}
                <div className="lg:col-span-2 flex items-end">
                  <button
                    onClick={handleSearch}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold py-3 px-4 rounded-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center group"
                  >
                    <Search className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                    Search
                  </button>
                </div>
              </div>

              {/* Date Range Info */}
              {(checkInDate || checkOutDate) && (
                <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
                  <div className="flex items-center text-sm text-emerald-800">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>
                      {checkInDate && checkOutDate 
                        ? `Selected: ${formatDate(checkInDate)} to ${formatDate(checkOutDate)}`
                        : checkInDate 
                          ? `Check-in: ${formatDate(checkInDate)}`
                          : `Check-out: ${formatDate(checkOutDate)}`
                      }
                      {checkInDate && checkOutDate && (
                        <span className="ml-2 text-emerald-600">
                          ({Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24))} nights)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Quick Filters */}
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                <button 
                  onClick={() => {
                    const today = new Date();
                    const nextWeek = new Date(today);
                    nextWeek.setDate(today.getDate() + 7);
                    setCheckInDate(today);
                    setCheckOutDate(nextWeek);
                  }}
                  className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm hover:bg-emerald-100 transition flex items-center"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Next Week
                </button>
                <button 
                  onClick={() => {
                    const today = new Date();
                    const in30Days = new Date(today);
                    in30Days.setDate(today.getDate() + 30);
                    setCheckInDate(today);
                    setCheckOutDate(in30Days);
                  }}
                  className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100 transition flex items-center"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Next 30 Days
                </button>
                <button 
                  onClick={() => {
                    // Set dates for Ramadan 2024 (example: March 10 - April 9)
                    setCheckInDate(new Date(2024, 2, 10)); // March 10, 2024
                    setCheckOutDate(new Date(2024, 3, 9)); // April 9, 2024
                  }}
                  className="px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm hover:bg-amber-100 transition flex items-center"
                >
                  <Hotel className="h-3 w-3 mr-1" />
                  Ramadan 2024
                </button>
                <button 
                  onClick={() => {
                    setCheckInDate(null);
                    setCheckOutDate(null);
                    setDestination('Makkah & Madinah');
                    setDepartureCity('');
                    setTravelers('2 Adults');
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>

          {/* Rest of your component (stats, etc.) remains the same */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {/* Stats cards remain the same */}
            <div className="text-center p-6 bg-gradient-to-br from-white/5 to-transparent rounded-2xl backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all hover:scale-105">
              <div className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">200+</div>
              <p className="text-emerald-200 text-sm md:text-base">Verified Agencies</p>
            </div>
            {/* ... other stats ... */}
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent"></div>
    </div>
  );
};

export default HeroSection;