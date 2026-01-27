import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Menu, 
  User, 
  Shield, 
  Sparkles,
  Briefcase,
  Globe,
  Compass,
  Map,
  Star,
  Heart,
  Home,
  Calendar,
  Users,
  BookOpen
} from 'lucide-react';
import logoImage from '../assets/umramarket.png';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeNav, setActiveNav] = useState('Packages');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigationItems = [
    { 
      label: 'Packages',
      icon: <Briefcase className="h-4 w-4" />,
      activeIcon: <Briefcase className="h-4 w-4" /> 
    },
    { 
      label: 'Experiences',
      icon: <Compass className="h-4 w-4" />,
      activeIcon: <Globe className="h-4 w-4" />
    },
    { 
      label: 'Guidance',
      icon: <BookOpen className="h-4 w-4" />,
      activeIcon: <BookOpen className="h-4 w-4" fill="currentColor" />
    }
  ];

  return (
    <header className={`sticky top-0 z-50 transition-all duration-500 ${
      isScrolled 
        ? 'bg-white/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border-b border-gray-100' 
        : 'bg-white'
    }`}>
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo - Left */}
          <div className="flex items-center flex-shrink-0 lg:flex-1">
            <img 
              src={logoImage} 
              alt="Umrah Market Logo" 
              className="h-10 w-auto hover:opacity-90 transition-opacity duration-300 cursor-pointer"
            />
          </div>

          {/* Desktop Navigation - Absolutely Centered */}
          <nav className="hidden lg:flex items-center absolute left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-1 bg-gray-50/80 backdrop-blur-sm rounded-2xl p-1.5 border border-gray-200/60 shadow-sm">
              {navigationItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => setActiveNav(item.label)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                    activeNav === item.label 
                      ? 'bg-white text-emerald-700 shadow-lg shadow-emerald-100/50 border border-emerald-100/30' 
                      : 'text-gray-700 hover:text-emerald-600 hover:bg-white/50'
                  }`}
                >
                  <span className={`transition-colors duration-300 ${
                    activeNav === item.label ? 'text-emerald-600' : 'text-gray-500 group-hover:text-emerald-500'
                  }`}>
                    {activeNav === item.label ? item.activeIcon : item.icon}
                  </span>
                  <span className="font-semibold">{item.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center justify-end space-x-4 lg:flex-1">
            
            {/* Trust Badge */}
            <div className="hidden lg:flex items-center px-4 py-2.5 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50/50 border border-emerald-100/50 hover:border-emerald-200/70 transition-all duration-300 group cursor-default mr-4">
              <Shield className="h-4 w-4 text-emerald-600 mr-2" />
              <span className="text-sm font-semibold text-emerald-700">Verified</span>
              <Sparkles className="h-3 w-3 ml-1.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-2">
              {/* Search Button - Desktop */}
              <button className="hidden lg:flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 transition-all duration-300 group">
                <Search className="h-4 w-4 text-gray-600 group-hover:text-emerald-600 transition-colors" />
              </button>

              {/* User Profile */}
              <button className="flex items-center space-x-3 px-4 py-2.5 rounded-full hover:shadow-lg hover:bg-gray-50 transition-all duration-300 border border-gray-200 hover:border-gray-300 group">
                <Menu className="h-4 w-4 text-gray-600 group-hover:text-emerald-600 transition-colors" />
                <div className="p-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 group-hover:from-emerald-600 group-hover:to-teal-500 transition-all duration-300 shadow-sm">
                  <User className="h-4 w-4 text-white" />
                </div>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button className="lg:hidden flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 transition-colors">
              <Menu className="h-6 w-6 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="lg:hidden mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search Umrah packages..."
              className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all duration-300"
            />
          </div>
        </div>

        {/* Mobile Navigation - Fixed at bottom for better UX */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] py-3 px-4 z-40">
          <div className="flex justify-around">
            {navigationItems.map((item) => (
              <button
                key={item.label}
                onClick={() => setActiveNav(item.label)}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all duration-300 ${
                  activeNav === item.label 
                    ? 'text-emerald-600' 
                    : 'text-gray-500 hover:text-emerald-500'
                }`}
              >
                <div className={`${
                  activeNav === item.label ? 'text-emerald-600' : 'text-gray-500'
                }`}>
                  {activeNav === item.label ? item.activeIcon : item.icon}
                </div>
                <div className={`text-xs font-medium mt-1 ${
                  activeNav === item.label ? 'font-semibold' : 'font-medium'
                }`}>
                  {item.label}
                </div>
                {activeNav === item.label && (
                  <div className="h-1 w-6 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full mt-1"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;