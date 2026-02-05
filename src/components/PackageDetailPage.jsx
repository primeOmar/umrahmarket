import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, Heart, Share2, Star, Shield, CheckCircle, 
  MapPin, Calendar, Users, Hotel, Clock, DollarSign, 
  Wifi, Coffee, Car, Dumbbell, Utensils, Tv, Wind, 
  Droplets, Bed, Bath, Users as UsersIcon, Maximize2, 
  Minus, Plus, AlertCircle, Phone, Mail, CreditCard, 
  Lock, User, Globe, Info, ChevronRight, X
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

const PackageDetailPage = ({ packages, favorites, toggleFavorite }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [packageData, setPackageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [guests, setGuests] = useState({ adults: 2, children: 0, infants: 0 });
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    phone: '',
    passport: '',
    nationality: '',
    specialRequests: ''
  });
  const [activeImage, setActiveImage] = useState(0);
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  // Amenities data
  const amenities = [
    { icon: <Wifi className="h-5 w-5" />, label: 'Free High-Speed WiFi' },
    { icon: <Coffee className="h-5 w-5" />, label: 'Complimentary Breakfast' },
    { icon: <Car className="h-5 w-5" />, label: '24/7 Airport Transfer' },
    { icon: <Dumbbell className="h-5 w-5" />, label: 'Fitness Center' },
    { icon: <Utensils className="h-5 w-5" />, label: 'Halal Restaurant' },
    { icon: <Tv className="h-5 w-5" />, label: 'Smart TV with Quran Channels' },
    { icon: <Wind className="h-5 w-5" />, label: 'Air Conditioning' },
    { icon: <Droplets className="h-5 w-5" />, label: 'Prayer Mats & Quran' },
    { icon: <Bed className="h-5 w-5" />, label: 'Premium Bedding' },
    { icon: <Bath className="h-5 w-5" />, label: 'Luxury Bathroom Amenities' },
    { icon: <Shield className="h-5 w-5" />, label: '24/7 Security & CCTV' },
    { icon: <UsersIcon className="h-5 w-5" />, label: 'Family Rooms Available' }
  ];

  // Itinerary data
  const itinerary = [
    { 
      day: 1, 
      title: 'Arrival in Jeddah', 
      description: 'VIP airport reception, immigration assistance, luxury transfer to Makkah hotel',
      activities: ['Airport Pickup', 'Hotel Check-in', 'Welcome Dinner']
    },
    { 
      day: 2, 
      title: 'Umrah Performance', 
      description: 'Guided Umrah performance with experienced scholar, Ihram guidance',
      activities: ['Tawaf', 'Sa\'i', 'Hair Cutting']
    },
    { 
      day: 3, 
      title: 'Ziyarat in Makkah', 
      description: 'Visit historical Islamic sites in and around Makkah',
      activities: ['Jabal al-Nour', 'Hira Cave', 'Masjid al-Jinn']
    },
    { 
      day: 4, 
      title: 'Transfer to Madinah', 
      description: 'Comfortable travel to Madinah, visit Prophet\'s Mosque',
      activities: ['Travel to Madinah', 'Hotel Check-in', 'Rawdah Visit']
    },
    { 
      day: 5, 
      title: 'Ziyarat in Madinah', 
      description: 'Explore significant historical sites in Madinah',
      activities: ['Quba Mosque', 'Uhud Mountain', 'Qiblatain Mosque']
    },
    { 
      day: 6, 
      title: 'Spiritual Day', 
      description: 'Personal time for prayers, reflection, and optional activities',
      activities: ['Optional Tours', 'Shopping', 'Personal Time']
    },
    { 
      day: 7, 
      title: 'Departure', 
      description: 'Final prayers, farewell breakfast, airport transfer',
      activities: ['Final Prayers', 'Airport Transfer', 'Departure']
    }
  ];

  // Reviews data
  const reviews = [
    {
      id: 1,
      name: 'Ahmed Khan',
      avatar: 'AK',
      rating: 4.9,
      date: '2 weeks ago',
      comment: 'Excellent service! The hotel was just 200m from Haram. The guide was very knowledgeable about the rituals. Highly recommended for first-timers.',
      verified: true,
      stay: 'December 2024',
      helpful: 24
    },
    {
      id: 2,
      name: 'Fatima Ali',
      avatar: 'FA',
      rating: 4.7,
      date: '1 month ago',
      comment: 'Perfect for families. Kids loved the activities and the hotel had excellent facilities. The distance to Haram was exactly as promised.',
      verified: true,
      stay: 'November 2024',
      helpful: 18
    },
    {
      id: 3,
      name: 'Mohammed Yusuf',
      avatar: 'MY',
      rating: 5.0,
      date: '3 days ago',
      comment: 'Best Umrah experience ever. Everything was perfectly arranged from flights to hotels to guidance. Will definitely book again for Hajj.',
      verified: true,
      stay: 'January 2025',
      helpful: 32
    }
  ];

 

 
 useEffect(() => {
  // Simulate API call
  setTimeout(() => {
    const foundPackage = packages.find(pkg => pkg.id === parseInt(id)); 
    setPackageData(foundPackage);
    setLoading(false);
    
    // Set default dates (next month)
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const checkIn = nextMonth.toISOString().split('T')[0];
    nextMonth.setDate(nextMonth.getDate() + (foundPackage?.duration || 10));
    const checkOut = nextMonth.toISOString().split('T')[0];
    setCheckInDate(checkIn);
    setCheckOutDate(checkOut);
  }, 500);
}, [id, packages]); // <-- Add packages to dependencies

 const calculateTotal = () => {
  if (!packageData) return 0;
  
  const adultPrice = packageData.price;
  const childPrice = packageData.price * 0.5;
  
  const totalAdults = guests.adults * adultPrice;
  const totalChildren = guests.children * childPrice;
  
  // NO additional taxes or discounts - everything is already included in packageData.price
  return totalAdults + totalChildren;
};

  const formatPrice = (price) => {
    return price.toLocaleString('en-US');
  };

  const handleBooking = () => {
    setShowBookingModal(true);
  };

  const handlePayment = () => {
    // Simulate payment processing
    setTimeout(() => {
      setBookingStep(3);
    }, 2000);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateNights = () => {
    if (!checkInDate || !checkOutDate) return 0;
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse">
          <div className="h-96 bg-gray-200"></div>
          <div className="container mx-auto px-4 py-8">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-48 bg-gray-200 rounded"></div>
                <div className="h-48 bg-gray-200 rounded"></div>
              </div>
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!packageData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Package not found</h2>
          <button 
            onClick={() => navigate('/')}
            className="text-emerald-600 hover:text-emerald-700"
          >
            Return to packages
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 mr-1" />
              <span className="hidden sm:inline">Back to packages</span>
            </button>
            <div className="flex items-center space-x-4">
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Share2 className="h-5 w-5 text-gray-600" />
              </button>
             <button 
  onClick={() => packageData && toggleFavorite(packageData.id)}
  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
>
  <Heart className={`h-5 w-5 ${packageData && favorites.includes(packageData.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
</button>
              <button className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors">
                Book Now
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Package Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {packageData.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center">
              <Star className="h-4 w-4 text-amber-500 fill-current mr-1" />
              <span className="font-medium">{packageData.rating}</span>
              <span className="mx-1">·</span>
              <span>{packageData.reviews} reviews</span>
            </div>
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              {packageData.distance} from Haram
            </div>
            <div className="flex items-center">
              <Hotel className="h-4 w-4 mr-1" />
              {packageData.hotelRating} Hotel
            </div>
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-emerald-600 mr-1" />
              <span className="text-emerald-600 font-medium">Verified Package</span>
            </div>
          </div>
        </div>
{/* Image Gallery */}
<div className="grid grid-cols-1 lg:grid-cols-4 gap-2 mb-8">
  <div className="lg:col-span-2 lg:row-span-2">
    <div className="relative h-64 lg:h-full rounded-2xl overflow-hidden">
      <img
        src={packageData.images?.[activeImage] || packageData.image}
        alt="Main package view"
        className="w-full h-full object-cover"
      />
      <button className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-lg hover:scale-110 transition-transform">
        <Maximize2 className="h-5 w-5" />
      </button>
    </div>
  </div>
  {(packageData.images || [packageData.image]).slice(1, 5).map((img, index) => (
    <div 
      key={index} 
      className="relative h-32 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
      onClick={() => setActiveImage(index + 1)}
    >
      <img
        src={img}
        alt={`Gallery ${index + 2}`}
        className="w-full h-full object-cover"
      />
      {index === 3 && packageData.images && packageData.images.length > 4 && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <span className="text-white font-medium">+{packageData.images.length - 4} more</span>
        </div>
      )}
    </div>
  ))}
</div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Package Details */}
          <div className="lg:col-span-2">
            {/* Highlights */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Package Highlights</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-gray-900">5-Star Accommodation</h3>
                    <p className="text-sm text-gray-600">Luxury hotels with Haram views</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-gray-900">Expert Guidance</h3>
                    <p className="text-sm text-gray-600">Certified Umrah guides</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-gray-900">VIP Transport</h3>
                    <p className="text-sm text-gray-600">Private vehicles with drivers</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-gray-900">24/7 Support</h3>
                    <p className="text-sm text-gray-600">Dedicated customer service</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">About this package</h2>
              <div className="prose max-w-none">
                <p className="text-gray-700 mb-4">
                  Experience the spiritual journey of a lifetime with our premium Umrah package. 
                  Designed for comfort and convenience, this package includes everything you need 
                  for a blessed pilgrimage.
                </p>
                <ul className="space-y-2 mb-4">
                  {packageData.includes.map((item, index) => (
                    <li key={index} className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-emerald-600 mr-2 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Amenities */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Amenities</h2>
                <button 
                  onClick={() => setShowAllAmenities(!showAllAmenities)}
                  className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                >
                  {showAllAmenities ? 'Show less' : 'Show all'}
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(showAllAmenities ? amenities : amenities.slice(0, 6)).map((amenity, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-emerald-600">
                      {amenity.icon}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{amenity.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Itinerary */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Daily Itinerary</h2>
              <div className="space-y-6">
                {itinerary.map((day) => (
                  <div key={day.day} className="border-l-4 border-emerald-500 pl-6 py-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center mb-2">
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold mr-3">
                            Day {day.day}
                          </span>
                          <h3 className="text-lg font-semibold text-gray-900">{day.title}</h3>
                        </div>
                        <p className="text-gray-600 mb-3">{day.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {day.activities.map((activity, idx) => (
                            <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                              {activity}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Guest Reviews</h2>
                  <div className="flex items-center mt-1">
                    <Star className="h-5 w-5 text-amber-500 fill-current" />
                    <span className="ml-1 text-lg font-bold">{packageData.rating}</span>
                    <span className="mx-2">·</span>
                    <span className="text-gray-600">{packageData.reviews} reviews</span>
                  </div>
                </div>
                <button className="text-emerald-600 hover:text-emerald-700 font-medium">
                  View all reviews
                </button>
              </div>
              
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-200 pb-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                          <span className="font-semibold text-emerald-700">{review.avatar}</span>
                        </div>
                        <div>
                          <div className="flex items-center">
                            <h4 className="font-semibold text-gray-900">{review.name}</h4>
                            {review.verified && (
                              <CheckCircle className="h-4 w-4 text-emerald-600 ml-1" />
                            )}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Star className="h-3 w-3 text-amber-500 fill-current mr-1" />
                            <span>{review.rating}</span>
                            <span className="mx-2">·</span>
                            <span>{review.date}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-3">{review.comment}</p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Stayed {review.stay}</span>
                      <button className="text-gray-500 hover:text-gray-700">
                        Helpful ({review.helpful})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Location */}
            {/* <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Location</h2>
              <div className="bg-gray-100 rounded-2xl p-4">
                <div className="flex items-start mb-4">
                  <MapPin className="h-5 w-5 text-emerald-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Perfect Location</h3>
                    <p className="text-gray-600">Only {packageData.distance} from the Holy Haram</p>
                    <p className="text-sm text-gray-500 mt-1">Easy access to prayer times and Taraweeh</p>
                  </div>
                </div>
                <div className="aspect-video bg-gray-300 rounded-lg">
                  {/* Map placeholder 
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    Interactive Map
                  </div>
                </div>
              </div>
            </div> */}
          </div>

          {/* Right Column - Booking Card */}
          <div className="lg:col-span-1">
  <div className="sticky top-24">
    <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-6">
      {/* Price & Discount Badge */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-gray-900">
              ${formatPrice(packageData.price)}
            </span>
            <span className="text-gray-500 ml-2">per person</span>
          </div>
          {packageData.originalPrice && (
            <div className="text-right">
              <span className="text-gray-500 line-through text-sm block">
                ${formatPrice(packageData.originalPrice)}
              </span>
              <span className="px-3 py-1 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold rounded-full">
                Save {packageData.discount}%
              </span>
            </div>
          )}
        </div>
        
        {/* Package Duration & Dates */}
        <div className="flex items-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <Calendar className="h-4 w-4 mr-2 text-emerald-600" />
          <span className="font-medium">{packageData.duration} days</span>
          <span className="mx-2">•</span>
          <span>All inclusive package</span>
        </div>
        
        {/* Price includes badge */}
        <div className="mt-3 bg-emerald-50 border border-emerald-100 rounded-lg p-3">
          <div className="flex items-start">
            <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-emerald-700">
              <span className="font-medium">Price includes:</span> All taxes, service fees, and {packageData.discount}% early booking discount
            </div>
          </div>
        </div>
      </div>

      {/* Travel Group Selection */}
      <div className="space-y-6 mb-6">
        {/* Adults */}
        <div className="bg-gray-50 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-semibold text-gray-900 flex items-center">
                <User className="h-4 w-4 mr-2 text-emerald-600" />
                Adults
              </div>
              <div className="text-sm text-gray-500">Age 12+</div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setGuests(prev => ({ ...prev, adults: Math.max(1, prev.adults - 1) }))}
                className="w-10 h-10 flex items-center justify-center border border-gray-300 bg-white rounded-full hover:border-emerald-500 hover:bg-emerald-50 hover:scale-105 transition-all"
              >
                <Minus className="h-4 w-4 text-gray-600" />
              </button>
              <span className="font-bold text-xl text-gray-900 min-w-[40px] text-center">{guests.adults}</span>
              <button
                onClick={() => setGuests(prev => ({ ...prev, adults: prev.adults + 1 }))}
                className="w-10 h-10 flex items-center justify-center border border-gray-300 bg-white rounded-full hover:border-emerald-500 hover:bg-emerald-50 hover:scale-105 transition-all"
              >
                <Plus className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Children */}
        <div className="bg-gray-50 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-semibold text-gray-900 flex items-center">
                <Users className="h-4 w-4 mr-2 text-emerald-600" />
                Children
              </div>
              <div className="text-sm text-gray-500">Ages 2-11 (50% of adult price)</div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setGuests(prev => ({ ...prev, children: Math.max(0, prev.children - 1) }))}
                className="w-10 h-10 flex items-center justify-center border border-gray-300 bg-white rounded-full hover:border-emerald-500 hover:bg-emerald-50 hover:scale-105 transition-all"
              >
                <Minus className="h-4 w-4 text-gray-600" />
              </button>
              <span className="font-bold text-xl text-gray-900 min-w-[40px] text-center">{guests.children}</span>
              <button
                onClick={() => setGuests(prev => ({ ...prev, children: prev.children + 1 }))}
                className="w-10 h-10 flex items-center justify-center border border-gray-300 bg-white rounded-full hover:border-emerald-500 hover:bg-emerald-50 hover:scale-105 transition-all"
              >
                <Plus className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Room Type Selection */}
        <div className="bg-gray-50 p-4 rounded-xl">
          <div className="mb-3">
            <div className="font-semibold text-gray-900 flex items-center mb-2">
              <Hotel className="h-4 w-4 mr-2 text-emerald-600" />
              Room Preference
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="p-3 text-sm font-medium rounded-lg border border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 transition-all">
                Standard
              </button>
              <button className="p-3 text-sm font-medium rounded-lg border-2 border-emerald-500 bg-emerald-50 text-emerald-700">
                Connecting
              </button>
              <button className="p-3 text-sm font-medium rounded-lg border border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 transition-all">
                Family Suite
              </button>
              <button className="p-3 text-sm font-medium rounded-lg border border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 transition-all">
                Haram View
              </button>
            </div>
          </div>
        </div>

        {/* Meal Plan Selection */}
        <div className="bg-gray-50 p-4 rounded-xl">
          <div className="mb-3">
            <div className="font-semibold text-gray-900 flex items-center mb-2">
              <Utensils className="h-4 w-4 mr-2 text-emerald-600" />
              Meal Plan
            </div>
            <div className="space-y-2">
              <label className="flex items-center p-3 rounded-lg border border-gray-300 hover:border-emerald-500 cursor-pointer">
                <input type="radio" name="meal" className="h-4 w-4 text-emerald-600 mr-3" defaultChecked />
                <div>
                  <div className="font-medium">Breakfast Only</div>
                  <div className="text-sm text-gray-500">Complimentary daily breakfast</div>
                </div>
              </label>
              <label className="flex items-center p-3 rounded-lg border-2 border-emerald-500 bg-emerald-50 cursor-pointer">
                <input type="radio" name="meal" className="h-4 w-4 text-emerald-600 mr-3" />
                <div>
                  <div className="font-medium text-emerald-700">Full Board</div>
                  <div className="text-sm text-emerald-600">All meals included + Iftar during Ramadan</div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Price Breakdown - SIMPLIFIED */}
      <div className="border-t border-gray-200 pt-6 mb-6">
        <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center">
          <DollarSign className="h-5 w-5 mr-2 text-emerald-600" />
          Price Summary
        </h3>
        <div className="space-y-3">
          {/* Adults */}
          {guests.adults > 0 && (
            <div className="flex justify-between items-center">
              <div>
                <div className="text-gray-700">Adults × {guests.adults}</div>
                <div className="text-sm text-gray-500">${formatPrice(packageData.price)} per adult</div>
              </div>
              <span className="font-medium">${formatPrice(packageData.price * guests.adults)}</span>
            </div>
          )}
          
          {/* Children */}
          {guests.children > 0 && (
            <div className="flex justify-between items-center">
              <div>
                <div className="text-gray-700">Children × {guests.children}</div>
                <div className="text-sm text-gray-500">${formatPrice(packageData.price * 0.5)} per child (50%)</div>
              </div>
              <span className="font-medium">${formatPrice(packageData.price * 0.5 * guests.children)}</span>
            </div>
          )}
          
          {/* Already Included Section */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 mt-2">
            <div className="space-y-1">
              <div className="flex items-center text-sm text-emerald-700">
                <CheckCircle className="h-3 w-3 mr-2 flex-shrink-0" />
                <span>All taxes & service fees included</span>
              </div>
              <div className="flex items-center text-sm text-emerald-700">
                <CheckCircle className="h-3 w-3 mr-2 flex-shrink-0" />
                <span>{packageData.discount}% early booking discount applied</span>
              </div>
              <div className="flex items-center text-sm text-emerald-700">
                <CheckCircle className="h-3 w-3 mr-2 flex-shrink-0" />
                <span>No hidden charges</span>
              </div>
            </div>
          </div>
          
          {/* Total Amount */}
          <div className="border-t border-gray-300 pt-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold text-lg text-gray-900">Total amount</div>
                <div className="text-sm text-gray-500">All inclusive • {guests.adults + guests.children} travelers</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-2xl text-gray-900">${formatPrice(calculateTotal())}</div>
                <div className="text-sm text-gray-500">Final price</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Book Now Button */}
      <button
        onClick={handleBooking}
        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl hover:shadow-2xl hover:scale-[1.02] transform transition-all duration-300 group relative overflow-hidden"
      >
        <span className="relative z-10">Book Now • ${formatPrice(calculateTotal())}</span>
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-700 to-teal-700 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
      </button>

      {/* Trust Signals */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="space-y-1">
            <Shield className="h-5 w-5 text-emerald-600 mx-auto" />
            <div className="text-xs font-medium text-gray-900">All Inclusive</div>
            <div className="text-xs text-gray-500">No hidden charges</div>
          </div>
          <div className="space-y-1">
            <CheckCircle className="h-5 w-5 text-emerald-600 mx-auto" />
            <div className="text-xs font-medium text-gray-900">Best Price</div>
            <div className="text-xs text-gray-500">Guaranteed</div>
          </div>
        </div>
        
        {/* Payment Methods */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-2">We accept</div>
          <div className="flex items-center justify-center space-x-3">
            <div className="w-8 h-5 bg-blue-100 rounded flex items-center justify-center text-xs font-bold text-blue-800">VISA</div>
            <div className="w-8 h-5 bg-yellow-100 rounded flex items-center justify-center text-xs font-bold text-yellow-800">MC</div>
            <div className="w-8 h-5 bg-green-100 rounded flex items-center justify-center text-xs font-bold text-green-800">PP</div>
            <div className="text-xs text-gray-500">+ more</div>
          </div>
        </div>
      </div>
    </div>

    {/* Need Help Section */}
    <div className="mt-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6">
      <div className="flex items-start mb-4">
        <Info className="h-5 w-5 text-emerald-600 mt-0.5 mr-2 flex-shrink-0" />
        <div>
          <h3 className="font-bold text-gray-900 mb-1">Need assistance?</h3>
          <p className="text-sm text-gray-600">Our Umrah experts are available 24/7</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <button className="w-full py-3 bg-white border border-emerald-600 text-emerald-600 font-medium rounded-lg hover:bg-emerald-600 hover:text-white transition-all duration-300 flex items-center justify-center">
          <Phone className="h-4 w-4 mr-2" />
          Call +966 12 345 6789
        </button>
        <button className="w-full py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors duration-300 flex items-center justify-center">
          <Mail className="h-4 w-4 mr-2" />
          Email us
        </button>
        <button className="w-full py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:border-emerald-500 hover:text-emerald-600 transition-colors duration-300">
          Live chat
        </button>
      </div>
      
      <div className="mt-4 pt-4 border-t border-emerald-100">
        <div className="flex items-center text-sm text-gray-600">
          <Clock className="h-4 w-4 mr-2 text-emerald-600" />
          <span>Response time: <span className="font-medium text-emerald-700">Under 5 minutes</span></span>
        </div>
      </div>
    </div>
  </div>
</div>
        </div>

       {/* Similar Packages */}
<div className="mt-12">
  <h2 className="text-2xl font-bold text-gray-900 mb-6">Similar packages you might like</h2>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {packages
      .filter(pkg => 
        pkg.id !== packageData.id && 
        (pkg.type === packageData.type || pkg.location === packageData.location)
      )
      .slice(0, 3)
      .map((pkg) => (
        <div key={pkg.id} className="border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
          <div className="relative h-48">
            <img
              src={pkg.image}
              alt={pkg.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 right-3 px-2 py-1 bg-emerald-600 text-white text-xs font-semibold rounded">
              -{pkg.discount}%
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{pkg.duration} days</span>
              <div className="flex items-center">
                <Star className="h-3 w-3 text-amber-500 fill-current mr-1" />
                <span className="text-sm font-medium">{pkg.rating}</span>
              </div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{pkg.title}</h3>
            <div className="flex items-baseline">
              <span className="text-xl font-bold text-gray-900">${formatPrice(pkg.price)}</span>
              <span className="text-gray-500 text-sm ml-2">per person</span>
            </div>
            <button
              onClick={() => navigate(`/package/${pkg.id}`)}
              className="w-full mt-4 py-2 border border-emerald-600 text-emerald-600 font-medium rounded-lg hover:bg-emerald-50 transition-colors"
            >
              View details
            </button>
          </div>
        </div>
      ))}
  </div>
</div>
      </main>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {bookingStep === 1 && 'Complete your booking'}
                  {bookingStep === 2 && 'Payment details'}
                  {bookingStep === 3 && 'Booking confirmed!'}
                </h2>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bookingStep >= 1 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    1
                  </div>
                  <span className="ml-2 text-sm font-medium">Details</span>
                </div>
                <div className="flex-1 h-1 mx-4 bg-gray-200">
                  <div className={`h-full ${bookingStep >= 2 ? 'bg-emerald-600' : 'bg-gray-200'}`}></div>
                </div>
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bookingStep >= 2 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    2
                  </div>
                  <span className="ml-2 text-sm font-medium">Payment</span>
                </div>
                <div className="flex-1 h-1 mx-4 bg-gray-200">
                  <div className={`h-full ${bookingStep >= 3 ? 'bg-emerald-600' : 'bg-gray-200'}`}></div>
                </div>
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bookingStep >= 3 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    3
                  </div>
                  <span className="ml-2 text-sm font-medium">Confirm</span>
                </div>
              </div>

              {/* Step 1: Personal Details */}
              {bookingStep === 1 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Traveler information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={userInfo.name}
                        onChange={(e) => setUserInfo(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={userInfo.email}
                        onChange={(e) => setUserInfo(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        placeholder="your@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={userInfo.phone}
                        onChange={(e) => setUserInfo(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        placeholder="+1234567890"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Passport Number *
                      </label>
                      <input
                        type="text"
                        value={userInfo.passport}
                        onChange={(e) => setUserInfo(prev => ({ ...prev, passport: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        placeholder="Passport number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nationality *
                      </label>
                      <input
                        type="text"
                        value={userInfo.nationality}
                        onChange={(e) => setUserInfo(prev => ({ ...prev, nationality: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        placeholder="Your nationality"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Special Requests
                    </label>
                    <textarea
                      value={userInfo.specialRequests}
                      onChange={(e) => setUserInfo(prev => ({ ...prev, specialRequests: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="Any special requirements or requests..."
                    />
                  </div>
                  <button
                    onClick={() => setBookingStep(2)}
                    className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Continue to payment
                  </button>
                </div>
              )}

              {/* Step 2: Payment */}
              {bookingStep === 2 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Select payment method</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => setPaymentMethod('card')}
                      className={`w-full p-4 border rounded-lg flex items-center justify-between ${paymentMethod === 'card' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300'}`}
                    >
                      <div className="flex items-center">
                        <CreditCard className="h-5 w-5 mr-3" />
                        <div>
                          <div className="font-medium text-gray-900">Credit/Debit Card</div>
                          <div className="text-sm text-gray-500">Pay securely with your card</div>
                        </div>
                      </div>
                      {paymentMethod === 'card' && <CheckCircle className="h-5 w-5 text-emerald-600" />}
                    </button>
                    <button
                      onClick={() => setPaymentMethod('bank')}
                      className={`w-full p-4 border rounded-lg flex items-center justify-between ${paymentMethod === 'bank' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300'}`}
                    >
                      <div className="flex items-center">
                        <Globe className="h-5 w-5 mr-3" />
                        <div>
                          <div className="font-medium text-gray-900">Bank Transfer</div>
                          <div className="text-sm text-gray-500">Direct bank transfer</div>
                        </div>
                      </div>
                      {paymentMethod === 'bank' && <CheckCircle className="h-5 w-5 text-emerald-600" />}
                    </button>
                  </div>
                  
                  {paymentMethod === 'card' && (
                    <div className="border border-gray-300 rounded-lg p-4">
                      <div className="space-y-4">
                        <input
                          type="text"
                          placeholder="Card number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <input
                            type="text"
                            placeholder="MM/YY"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                          <input
                            type="text"
                            placeholder="CVC"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total amount</span>
                      <span>${formatPrice(calculateTotal())}</span>
                    </div>
                  </div>

                  <button
                    onClick={handlePayment}
                    className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Pay securely
                  </button>
                </div>
              )}

              {/* Step 3: Confirmation */}
              {bookingStep === 3 && (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="h-10 w-10 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Booking confirmed!</h3>
                  <p className="text-gray-600 mb-6">
                    Your Umrah package has been successfully booked. 
                    You will receive a confirmation email with all details.
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <div className="text-sm text-gray-500 mb-1">Booking reference</div>
                    <div className="font-mono font-bold text-lg text-gray-900">UMRAH-{id}-2025</div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => setShowBookingModal(false)}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                    >
                      View booking
                    </button>
                    <button
                      onClick={() => navigate('/')}
                      className="flex-1 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700"
                    >
                      Explore more packages
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackageDetailPage;