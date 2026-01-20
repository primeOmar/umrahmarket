import React from 'react';
import { Plane, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-gradient-to-r from-green-600 to-emerald-500 p-2 rounded-lg">
                <Plane className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Umrah Market</h3>
                <p className="text-gray-400 text-sm">Trusted Journeys, Spiritual Returns</p>
              </div>
            </div>
            <p className="text-gray-400 mb-6">
              Connecting pilgrims with verified Umrah agencies worldwide. 
              We ensure transparent pricing, verified services, and memorable spiritual journeys.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="bg-gray-800 p-2 rounded-lg hover:bg-gray-700">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="bg-gray-800 p-2 rounded-lg hover:bg-gray-700">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="bg-gray-800 p-2 rounded-lg hover:bg-gray-700">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="bg-gray-800 p-2 rounded-lg hover:bg-gray-700">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white">Browse Packages</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Register Agency</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Umrah Guide</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">FAQ</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Blog</a></li>
            </ul>
          </div>

          {/* Agencies */}
          <div>
            <h4 className="text-lg font-bold mb-4">For Agencies</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white">Register</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Dashboard</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Commission</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Resources</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Support</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-bold mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-green-400" />
                <span className="text-gray-400">support@umrahmarket.com</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="h-5 w-5 text-green-400" />
                <span className="text-gray-400">+1 (555) 123-4567</span>
              </li>
              <li className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-green-400" />
                <span className="text-gray-400">Makkah Road, Saudi Arabia</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              © {new Date().getFullYear()} Umrah Market. All rights reserved.
            </p>
            <div className="flex space-x-6 text-sm text-gray-400">
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-white">Terms of Service</a>
              <a href="#" className="hover:text-white">Cookie Policy</a>
              <a href="#" className="hover:text-white">Sitemap</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;