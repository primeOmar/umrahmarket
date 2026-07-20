import React, { useState } from 'react';
import { Mail, Phone, MapPin, Instagram, Youtube } from 'lucide-react';
import logoImage from '../assets/umramarket1.png';
import { useNavigate } from 'react-router-dom';
import AuthModal from './AuthModal';
import ChatWidget from '../publicchat/ChatWidget';

// TikTok and X (formerly Twitter) aren't in lucide-react — using their
// official mark as inline SVGs, sized/styled to match the lucide icons.
const TikTokIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M16.6 5.82c-1.08-.98-1.78-2.35-1.78-3.82h-3.14v13.4c0 1.6-1.3 2.9-2.9 2.9-1.6 0-2.9-1.3-2.9-2.9s1.3-2.9 2.9-2.9c.29 0 .57.04.83.13V9.46a6.1 6.1 0 0 0-.83-.06 6.05 6.05 0 0 0-6.05 6.05A6.05 6.05 0 0 0 8.78 21.5a6.05 6.05 0 0 0 6.05-6.05V8.85a9.14 9.14 0 0 0 5.35 1.71V7.42c-1.28 0-2.46-.44-3.58-1.6z"/>
  </svg>
);

const XIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.9 2H22l-7.6 8.68L23.3 22h-6.9l-5.4-6.6L4.8 22H1.7l8.1-9.27L1 2h7.1l4.9 6.03L18.9 2Zm-1.2 18h1.7L7.4 4h-1.8l12.1 16Z"/>
  </svg>
);

const Footer = () => {
  const navigate = useNavigate();
  const [showAgentModal, setShowAgentModal] = useState(false);

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-white p-2 rounded-lg">
                <div className="flex-shrink-0">
                  <img
                    src={logoImage}
                    alt="Umrah Market Logo"
                    className="h-8 sm:h-9 w-auto cursor-pointer hover:opacity-90 transition-opacity duration-300"
                    onClick={() => navigate('/')}
                  />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold">Umrah Market</h3>
                <p className="text-gray-400 text-sm">Your Trusted Pilgrimage Market</p>
              </div>
            </div>
            <p className="text-gray-400 mb-6">
             We are located at Al Mukaram Shopping Centre, <br/>Eastleigh Nairobi Kenya.
            </p>
            <div className="flex space-x-4">
              <a
                href="mailto:support@umrahmarket.net"
                aria-label="Email Umrah Market"
                className="bg-gray-800 p-2 rounded-lg hover:bg-gray-700"
              >
                <Mail className="h-5 w-5" />
              </a>
              <a
                href="https://www.instagram.com/umrahmarket360"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Umrah Market on Instagram"
                className="bg-gray-800 p-2 rounded-lg hover:bg-gray-700"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://www.tiktok.com/@umrahmarket360"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Umrah Market on TikTok"
                className="bg-gray-800 p-2 rounded-lg hover:bg-gray-700"
              >
                <TikTokIcon className="h-5 w-5" />
              </a>
              <a
                href="https://x.com/umrahmarket360"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Umrah Market on X"
                className="bg-gray-800 p-2 rounded-lg hover:bg-gray-700"
              >
                <XIcon className="h-5 w-5" />
              </a>
              <a
                href="https://www.youtube.com/@umrahmarket360"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Umrah Market on YouTube"
                className="bg-gray-800 p-2 rounded-lg hover:bg-gray-700"
              >
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className=''>
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
              <li><button onClick={() => setShowAgentModal(true)} className="text-gray-400 hover:text-white transition-colors">Register</button></li>
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
                <span className="text-gray-400">support@umrahmarket.net</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="h-5 w-5 text-green-400" />
                <span className="text-gray-400">+254 700 111 106</span>
              </li>
              <li className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-green-400" />
                <span className="text-gray-400">Al Mukaram Shopping</span>
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

      {/* Visitor ↔ Agent live chat */}
      <ChatWidget />

      {showAgentModal && (
        <div className="fixed inset-0 z-[100]">
          <AuthModal
            initialMode="agent"
            onClose={() => setShowAgentModal(false)}
            onAuthSuccess={(user) => {
              setShowAgentModal(false);
              navigate("/agent/dashboard?welcome=true");
            }}
          />
        </div>
      )}
    </footer>
  );
};

export default Footer;