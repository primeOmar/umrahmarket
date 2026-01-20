import React, { useState } from 'react';
import { Filter, ChevronDown } from 'lucide-react';

const Filters = ({ 
  sortBy, 
  setSortBy, 
  priceRange, 
  setPriceRange,
  selectedMonth,
  setSelectedMonth,
  months 
}) => {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const sortOptions = [
    { value: 'date', label: 'Departure Date' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'duration', label: 'Duration' }
  ];

  const starOptions = [
    { value: 'all', label: 'All Hotels' },
    { value: '5', label: '5 Stars' },
    { value: '4', label: '4 Stars & Above' },
    { value: '3', label: '3 Stars & Above' }
  ];

  const [selectedStars, setSelectedStars] = useState('all');

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      {/* Mobile Filter Toggle */}
      <button
        onClick={() => setIsFiltersOpen(!isFiltersOpen)}
        className="lg:hidden w-full flex items-center justify-between bg-gray-50 p-4 rounded-lg mb-4"
      >
        <div className="flex items-center">
          <Filter className="h-5 w-5 mr-2" />
          <span className="font-semibold">Filters & Sorting</span>
        </div>
        <ChevronDown className={`h-5 w-5 transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Filter Content */}
      <div className={`${isFiltersOpen ? 'block' : 'hidden'} lg:block`}>
        {/* Sort By */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Sort By</h3>
          <div className="flex flex-wrap gap-2">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value)}
                className={`px-4 py-2 rounded-lg transition ${sortBy === option.value
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">
            Price Range: ${priceRange[0]} - ${priceRange[1]}
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1000"
                max="7000"
                step="100"
                value={priceRange[0]}
                onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <input
                type="range"
                min="1000"
                max="7000"
                step="100"
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>$1,000</span>
              <span>$4,000</span>
              <span>$7,000</span>
            </div>
          </div>
        </div>

        {/* Months */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Departure Month</h3>
          <div className="flex flex-wrap gap-2">
            {months.map((month) => (
              <button
                key={month.id}
                onClick={() => setSelectedMonth(month.id)}
                className={`px-4 py-2 rounded-lg transition ${selectedMonth === month.id
                    ? 'bg-gradient-to-r from-green-600 to-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {month.name}
                {month.count > 0 && (
                  <span className="ml-2 bg-white/20 px-1.5 py-0.5 rounded text-xs">
                    {month.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Hotel Stars */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Hotel Rating</h3>
          <div className="flex flex-wrap gap-2">
            {starOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedStars(option.value)}
                className={`px-4 py-2 rounded-lg transition ${selectedStars === option.value
                    ? 'bg-amber-100 text-amber-700 border border-amber-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reset Filters */}
        <button
          onClick={() => {
            setSortBy('date');
            setPriceRange([1000, 7000]);
            setSelectedMonth('all');
            setSelectedStars('all');
          }}
          className="w-full py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
        >
          Reset All Filters
        </button>
      </div>
    </div>
  );
};

export default Filters;