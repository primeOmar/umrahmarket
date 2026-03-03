import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LayoutGrid, Users, Calendar, Package, DollarSign, Settings,
  LogOut, Bell, Search, Menu, X, ChevronDown, Download, Upload,
  TrendingUp, Star, MessageCircle, FileText, Shield, CreditCard,
  MapPin, Globe, Clock, CheckCircle, AlertCircle, Plus, Filter,
  MoreVertical, Edit, Trash2, Eye, Mail, Phone, User,
  Home, BarChart3, PieChart, Target, Award, Briefcase,
  BookOpen, Headphones, Image, Video, Camera, Lock,
  Printer, Share2, Copy, Check, RefreshCw
} from 'lucide-react';
import CreatePackageModal from './agent/CreatePackageModal';
import DocumentUploadModal from './agent/DocumentUploadModal';
// ==================== STATS CARD COMPONENT ====================
const StatCard = ({ icon: Icon, label, value, change, trend, color }) => (
  <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
    <div className="flex items-start justify-between mb-4">
      <div className={`p-3 rounded-xl bg-gradient-to-br ${color} bg-opacity-10`}>
        <Icon className={`h-6 w-6 ${color.split(' ')[1]}`} />
      </div>
      {trend && (
        <span className={`flex items-center text-sm font-medium ${
          trend > 0 ? 'text-emerald-600' : 'text-red-600'
        }`}>
          <TrendingUp className={`h-4 w-4 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
    <p className="text-sm text-gray-600">{label}</p>
    {change && (
      <p className="text-xs text-gray-500 mt-2">↑ {change} from last month</p>
    )}
  </div>
);

// ==================== CLIENT CARD COMPONENT ====================
const ClientCard = ({ client, onView, onMessage, onEdit }) => (
  <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg">
          {client.name.charAt(0)}
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">{client.name}</h4>
          <p className="text-sm text-gray-500">{client.email}</p>
        </div>
      </div>
      <div className="flex space-x-2">
        <button onClick={() => onMessage(client)} className="p-2 hover:bg-emerald-50 rounded-lg transition-colors">
          <MessageCircle className="h-4 w-4 text-emerald-600" />
        </button>
        <button onClick={() => onEdit(client)} className="p-2 hover:bg-blue-50 rounded-lg transition-colors">
          <Edit className="h-4 w-4 text-blue-600" />
        </button>
      </div>
    </div>
    
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div>
        <p className="text-xs text-gray-500 mb-1">Package</p>
        <p className="text-sm font-medium text-gray-900">{client.package}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">Status</p>
        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
          client.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
          client.status === 'pending' ? 'bg-amber-100 text-amber-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {client.status}
        </span>
      </div>
    </div>

    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
      <div className="flex items-center space-x-2 text-xs text-gray-500">
        <Calendar className="h-3 w-3" />
        <span>{client.travelDate}</span>
      </div>
      <button onClick={() => onView(client)} className="text-sm text-emerald-600 font-medium hover:text-emerald-700">
        View Details →
      </button>
    </div>
  </div>
);

// ==================== BOOKING CARD COMPONENT ====================
const BookingCard = ({ booking, onView, onUpdate }) => (
  <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100">
    <div className="flex items-start justify-between mb-4">
      <div>
        <h4 className="font-semibold text-gray-900">{booking.clientName}</h4>
        <p className="text-sm text-gray-500">Booking #{booking.id}</p>
      </div>
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
        booking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
        booking.status === 'pending' ? 'bg-amber-100 text-amber-700' :
        booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
        'bg-blue-100 text-blue-700'
      }`}>
        {booking.status}
      </span>
    </div>

    <div className="space-y-3 mb-4">
      <div className="flex items-center text-sm text-gray-600">
        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
        <span>{booking.date} · {booking.duration}</span>
      </div>
      <div className="flex items-center text-sm text-gray-600">
        <MapPin className="h-4 w-4 mr-2 text-gray-400" />
        <span>{booking.destination}</span>
      </div>
      <div className="flex items-center text-sm text-gray-600">
        <Users className="h-4 w-4 mr-2 text-gray-400" />
        <span>{booking.travelers} travelers</span>
      </div>
    </div>

    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
      <div className="text-sm font-semibold text-gray-900">
        ${booking.amount.toLocaleString()}
      </div>
      <div className="flex space-x-2">
        <button onClick={() => onView(booking)} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
          Details
        </button>
        <button onClick={() => onUpdate(booking)} className="px-3 py-1.5 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors">
          Update
        </button>
      </div>
    </div>
  </div>
);

// ==================== PACKAGE CARD COMPONENT ====================
const PackageCard = ({ pkg, onEdit, onDuplicate, onDelete }) => (
  <div className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100">
    <div className="relative h-48 overflow-hidden group">
      <img src={pkg.image} alt={pkg.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <div className="absolute top-4 right-4 flex space-x-2">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          pkg.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-gray-500 text-white'
        }`}>
          {pkg.status}
        </span>
      </div>
    </div>

    <div className="p-6">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">{pkg.name}</h4>
          <p className="text-sm text-gray-500">{pkg.duration}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-emerald-600">${pkg.price}</p>
          <p className="text-xs text-gray-500">per person</p>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{pkg.description}</p>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Star className="h-4 w-4 text-amber-400 fill-current" />
          <span>{pkg.rating}</span>
          <span className="text-gray-300">|</span>
          <Users className="h-4 w-4" />
          <span>{pkg.bookings}+ bookings</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex space-x-2">
          <button onClick={() => onEdit(pkg)} className="p-2 hover:bg-blue-50 rounded-lg transition-colors">
            <Edit className="h-4 w-4 text-blue-600" />
          </button>
          <button onClick={() => onDuplicate(pkg)} className="p-2 hover:bg-purple-50 rounded-lg transition-colors">
            <Copy className="h-4 w-4 text-purple-600" />
          </button>
          <button onClick={() => onDelete(pkg)} className="p-2 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="h-4 w-4 text-red-600" />
          </button>
        </div>
        <button className="text-sm text-emerald-600 font-medium hover:text-emerald-700">
          View Details →
        </button>
      </div>
    </div>
  </div>
);

// ==================== MAIN DASHBOARD COMPONENT ====================
const AgentDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreatePackage, setShowCreatePackage] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Sample data
  const stats = [
    { icon: Users, label: 'Total Clients', value: '156', change: '+12', trend: 8, color: 'from-blue-500 to-indigo-600 text-blue-600' },
    { icon: Calendar, label: 'Active Bookings', value: '43', change: '+5', trend: 12, color: 'from-emerald-500 to-teal-600 text-emerald-600' },
    { icon: DollarSign, label: 'Revenue (MTD)', value: '$127.5K', change: '+$23K', trend: 18, color: 'from-purple-500 to-pink-600 text-purple-600' },
    { icon: Star, label: 'Package Views', value: '8.2K', change: '+1.2K', trend: 15, color: 'from-amber-500 to-orange-600 text-amber-600' }
  ];

  const recentClients = [
    { id: 1, name: 'Ahmed Mohammed', email: 'ahmed@email.com', package: 'Premium Umrah', status: 'active', travelDate: 'Mar 15, 2024' },
    { id: 2, name: 'Fatima Hassan', email: 'fatima@email.com', package: 'Deluxe Hajj', status: 'pending', travelDate: 'Jun 20, 2024' },
    { id: 3, name: 'Omar Abdullah', email: 'omar@email.com', package: 'Economy Umrah', status: 'active', travelDate: 'Apr 5, 2024' },
    { id: 4, name: 'Aisha Rahman', email: 'aisha@email.com', package: 'VIP Hajj', status: 'completed', travelDate: 'Jan 10, 2024' }
  ];

  const recentBookings = [
    { id: 'B001', clientName: 'Ahmed Mohammed', date: 'Mar 15, 2024', duration: '10 Days', destination: 'Makkah & Madinah', travelers: 2, amount: 4500, status: 'confirmed' },
    { id: 'B002', clientName: 'Fatima Hassan', date: 'Jun 20, 2024', duration: '14 Days', destination: 'Hajj 2024', travelers: 1, amount: 8200, status: 'pending' },
    { id: 'B003', clientName: 'Omar Abdullah', date: 'Apr 5, 2024', duration: '7 Days', destination: 'Umrah Express', travelers: 4, amount: 6800, status: 'confirmed' }
  ];

  const packages = [
    {
      id: 1,
      name: 'Premium Umrah Package',
      duration: '10 Days / 9 Nights',
      price: 2499,
      description: 'Luxury Umrah experience with 5-star hotels in Makkah & Madinah, private transport, and VIP guidance.',
      rating: 4.9,
      bookings: 234,
      status: 'active',
      image: 'https://images.unsplash.com/photo-1542810634-71277ad95d9d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 2,
      name: 'Deluxe Hajj Package',
      duration: '21 Days / 20 Nights',
      price: 8999,
      description: 'Complete Hajj package with premium tents in Mina, Arafat, and Muzdalifah. Includes all transportation and meals.',
      rating: 5.0,
      bookings: 89,
      status: 'active',
      image: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
    }
  ];

  const notifications = [
    { id: 1, title: 'New Booking Request', message: 'Fatima Hassan requested Hajj package', time: '5 min ago', read: false },
    { id: 2, title: 'Document Verified', message: 'Your license has been approved', time: '2 hours ago', read: true },
    { id: 3, title: 'Payment Received', message: '$4,500 from Ahmed Mohammed', time: '1 day ago', read: true }
  ];

  const menuItems = [
    { id: 'overview', icon: Home, label: 'Overview' },
    { id: 'clients', icon: Users, label: 'Clients', count: 156 },
    { id: 'bookings', icon: Calendar, label: 'Bookings', count: 43 },
    { id: 'packages', icon: Package, label: 'Packages', count: 12 },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'documents', icon: FileText, label: 'Documents' },
    { id: 'messages', icon: MessageCircle, label: 'Messages', count: 8 },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  const handleViewClient = (client) => {
    console.log('View client:', client);
  };

  const handleMessageClient = (client) => {
    console.log('Message client:', client);
  };

  const handleEditClient = (client) => {
    console.log('Edit client:', client);
  };

  const handleViewBooking = (booking) => {
    console.log('View booking:', booking);
  };

  const handleUpdateBooking = (booking) => {
    console.log('Update booking:', booking);
  };

  const handleEditPackage = (pkg) => {
    console.log('Edit package:', pkg);
  };

  const handleDuplicatePackage = (pkg) => {
    console.log('Duplicate package:', pkg);
  };

  const handleDeletePackage = (pkg) => {
    if (window.confirm('Are you sure you want to delete this package?')) {
      console.log('Delete package:', pkg);
    }
  };

  const handleDocumentUpload = async (files) => {
    console.log('Uploading documents:', files);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
  };

  const handleSavePackage = (packageData) => {
    console.log('Saving package:', packageData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleDocumentUpload}
      />

      {/* Create Package Modal */}
      <CreatePackageModal
        isOpen={showCreatePackage}
        onClose={() => setShowCreatePackage(false)}
        onSave={handleSavePackage}
      />

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="h-full flex flex-col">
          {/* Agency Info */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                {user?.agencyName?.charAt(0) || 'A'}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{user?.agencyName || 'Travel Agency'}</h3>
                <p className="text-xs text-gray-500">License: {user?.licenseNumber || '••••••'}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">Verified Agency</span>
              <span className="text-gray-500">Member since 2024</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                      activeTab === item.id
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon className={`h-5 w-5 ${activeTab === item.id ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {item.count && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        activeTab === item.id
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {item.count}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Upgrade Banner */}
          <div className="p-4 m-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl text-white">
            <h4 className="font-semibold mb-2">Upgrade to Premium</h4>
            <p className="text-xs opacity-90 mb-3">Get more features and higher commission rates</p>
            <button className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">
              Learn More
            </button>
          </div>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={onLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-72' : 'ml-0'}`}>
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
          <div className="px-8 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              
              {/* Search */}
              <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clients, bookings, packages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Quick Actions */}
              <button
                onClick={() => setShowCreatePackage(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">New Package</span>
              </button>

              <button
                onClick={() => setShowUploadModal(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Upload Documents"
              >
                <Upload className="h-5 w-5 text-gray-600" />
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
                >
                  <Bell className="h-5 w-5 text-gray-600" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                      <button className="text-xs text-blue-600 hover:text-blue-700">Mark all as read</button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notif) => (
                        <div key={notif.id} className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-blue-50/30' : ''}`}>
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="text-sm font-medium text-gray-900">{notif.title}</h4>
                            <span className="text-xs text-gray-500">{notif.time}</span>
                          </div>
                          <p className="text-sm text-gray-600">{notif.message}</p>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 text-center border-t border-gray-200">
                      <button className="text-sm text-blue-600 hover:text-blue-700">View All</button>
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.agencyName || 'Agency Name'}</p>
                  <p className="text-xs text-gray-500">{user?.email || 'agency@email.com'}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                  {user?.agencyName?.charAt(0) || 'A'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                  <StatCard key={index} {...stat} />
                ))}
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-gray-900">Revenue Overview</h3>
                    <select className="text-sm border border-gray-200 rounded-lg px-3 py-2">
                      <option>Last 7 days</option>
                      <option>Last 30 days</option>
                      <option>Last 3 months</option>
                    </select>
                  </div>
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-xl">
                    <p className="text-gray-400">Chart visualization would go here</p>
                  </div>
                </div>

                {/* Booking Distribution */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-gray-900">Booking Distribution</h3>
                    <button className="text-sm text-emerald-600 hover:text-emerald-700">View Details →</button>
                  </div>
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-xl">
                    <p className="text-gray-400">Chart visualization would go here</p>
                  </div>
                </div>
              </div>

              {/* Recent Clients & Bookings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Clients */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-gray-900">Recent Clients</h3>
                    <button onClick={() => setActiveTab('clients')} className="text-sm text-emerald-600 hover:text-emerald-700">
                      View All →
                    </button>
                  </div>
                  <div className="space-y-4">
                    {recentClients.map((client) => (
                      <div key={client.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold">
                            {client.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{client.name}</h4>
                            <p className="text-xs text-gray-500">{client.package}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          client.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                          client.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {client.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Bookings */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-gray-900">Recent Bookings</h3>
                    <button onClick={() => setActiveTab('bookings')} className="text-sm text-emerald-600 hover:text-emerald-700">
                      View All →
                    </button>
                  </div>
                  <div className="space-y-4">
                    {recentBookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{booking.clientName}</h4>
                          <p className="text-xs text-gray-500">{booking.date} · ${booking.amount}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          booking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                          booking.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'clients' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Client Management</h2>
                <div className="flex space-x-3">
                  <button className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <Download className="h-4 w-4" />
                    <span className="text-sm font-medium">Export</span>
                  </button>
                  <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:shadow-lg transition-all">
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-medium">Add Client</span>
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center space-x-4">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search clients..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <Filter className="h-4 w-4" />
                  <span className="text-sm font-medium">Filter</span>
                </button>
                <select className="px-4 py-2 border border-gray-200 rounded-lg text-sm">
                  <option>All Status</option>
                  <option>Active</option>
                  <option>Pending</option>
                  <option>Completed</option>
                </select>
              </div>

              {/* Clients Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentClients.map((client) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    onView={handleViewClient}
                    onMessage={handleMessageClient}
                    onEdit={handleEditClient}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Booking Management</h2>
                <div className="flex space-x-3">
                  <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <Calendar className="h-4 w-4" />
                  </button>
                  <button className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:shadow-lg transition-all">
                    New Booking
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentBookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onView={handleViewBooking}
                    onUpdate={handleUpdateBooking}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'packages' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Travel Packages</h2>
                <button
                  onClick={() => setShowCreatePackage(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm font-medium">Create Package</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {packages.map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    onEdit={handleEditPackage}
                    onDuplicate={handleDuplicatePackage}
                    onDelete={handleDeletePackage}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Analytics & Reports</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-4">Booking Trends</h3>
                  <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
                    <p className="text-gray-400">Chart here</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-4">Popular Packages</h3>
                  <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
                    <p className="text-gray-400">Chart here</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-4">Client Demographics</h3>
                  <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
                    <p className="text-gray-400">Chart here</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4">Revenue Report</h3>
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                  <p className="text-gray-400">Detailed chart here</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Document Management</h2>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  <Upload className="h-4 w-4" />
                  <span className="text-sm font-medium">Upload Documents</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { name: 'Certificate of Incorporation', status: 'verified', date: 'Jan 15, 2024' },
                  { name: 'Travel Agency License', status: 'pending', date: 'Feb 1, 2024' },
                  { name: 'Tax Registration', status: 'verified', date: 'Jan 20, 2024' },
                  { name: 'Director ID', status: 'verified', date: 'Jan 15, 2024' },
                  { name: 'Insurance Certificate', status: 'expired', date: 'Dec 1, 2023' },
                  { name: 'Bank Statements', status: 'pending', date: 'Feb 5, 2024' }
                ].map((doc, index) => (
                  <div key={index} className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        doc.status === 'verified' ? 'bg-green-100 text-green-700' :
                        doc.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">{doc.name}</h4>
                    <p className="text-xs text-gray-500 mb-4">Uploaded: {doc.date}</p>
                    <div className="flex space-x-2">
                      <button className="flex-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                        View
                      </button>
                      <button className="flex-1 px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                        Update
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="grid grid-cols-3 h-[600px]">
                  {/* Conversation List */}
                  <div className="border-r border-gray-200">
                    <div className="p-4 border-b border-gray-200">
                      <input
                        type="text"
                        placeholder="Search conversations..."
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                      />
                    </div>
                    <div className="overflow-y-auto h-[calc(600px-73px)]">
                      {[1,2,3,4,5].map((i) => (
                        <div key={i} className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                          <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="text-sm font-medium text-gray-900 truncate">Client Name</h4>
                                <span className="text-xs text-gray-500">2h ago</span>
                              </div>
                              <p className="text-xs text-gray-600 truncate">Last message preview...</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chat Area */}
                  <div className="col-span-2 flex flex-col">
                    <div className="p-4 border-b border-gray-200">
                      <h4 className="font-medium text-gray-900">Client Name</h4>
                      <p className="text-xs text-gray-500">Online</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {/* Messages would go here */}
                    </div>
                    <div className="p-4 border-t border-gray-200">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          placeholder="Type your message..."
                          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
              
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Profile Settings</h3>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Agency Name</label>
                      <input
                        type="text"
                        defaultValue={user?.agencyName}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
                      <input
                        type="text"
                        defaultValue={user?.licenseNumber}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        defaultValue={user?.email}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        defaultValue={user?.phone}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all">
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                    <input
                      type="password"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                    <input
                      type="password"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all">
                      Update Password
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AgentDashboard;