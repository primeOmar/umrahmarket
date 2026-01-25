import React from 'react';
import { Plane, User, Menu, X } from 'lucide-react';
import { useState } from 'react';
import logoImage from '../assets/umramarket.png'; 

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { name: 'Home', href: '#' },
    { name: 'Packages', href: '#' },
    // { name: 'Agencies', href: '#' },
    { name: 'Guidance', href: '#' },
    { name: 'Reviews', href: '#' },
    { name: 'Contact', href: '#' }
  ];

  return (
    <header className="sticky top-0 z-50 bg-white shadow-lg">
      <div className="container mx-auto px-4">
  <div className="flex justify-between items-center py-2"> 
    {/* Logo - Large but with negative margins */}
    <div className="flex items-center space-x-3">
      <img 
        src={logoImage} 
        alt="Umrah Market Logo" 
        className="h-16 w-auto -my-2" 
      />
    </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-gray-700 hover:text-green-600 font-medium transition-colors"
              >
                {item.name}
              </a>
            ))}
          </nav>

          {/* Auth Buttons */}
          <div className="hidden lg:flex items-center space-x-4">
            <button className="flex items-center space-x-2 text-gray-700 hover:text-green-600">
              <User className="h-5 w-5" />
              <span>Sign In</span>
            </button>
            <button className="bg-gradient-to-r from-green-600 to-emerald-500 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-shadow">
              Register Agency
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-gray-700" />
            ) : (
              <Menu className="h-6 w-6 text-gray-700" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t">
            <div className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-gray-700 hover:text-green-600 py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </a>
              ))}
              <div className="pt-4 space-y-3">
                <button className="w-full flex items-center justify-center space-x-2 text-gray-700">
                  <User className="h-5 w-5" />
                  <span>Sign In</span>
                </button>
                <button className="w-full bg-green-600 text-white py-2 rounded-lg">
                  Register Agency
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;