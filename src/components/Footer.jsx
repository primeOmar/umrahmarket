import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Mail, Phone, MapPin, Instagram, Youtube } from 'lucide-react';
import logoImage from '../assets/umramarket1.png';
import { useNavigate } from 'react-router-dom';
import AuthModal from './AuthModal';
// Lazy + mount-gated on purpose: ChatWidget.jsx constructs a Supabase
// realtime client at module top level, which touches WebSocket — that
// doesn't exist in Node/SSR. A regular static import gets evaluated during
// SSR the moment Footer.jsx loads, regardless of whether <ChatWidget/> is
// actually rendered in JSX. Lazy-loading means the module is never fetched
// until this component actually calls for it client-side.
const ChatWidget = lazy(() => import('../publicchat/ChatWidget'));

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
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-white p-2 rounded-lg flex-shrink-0">
                <img
                  src={logoImage}
                  alt="Umrah Market Logo"
                  className="h-8 sm:h-9 w-auto cursor-pointer hover:opacity-90 transition-opacity duration-300"
                  onClick={() => navigate('/')}
                />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Umrah Market</h3>
                <p className="text-gray-400 text-sm">Your Trusted Pilgrimage Market</p>
              </div>
            </div>
            <p className="text-gray-400 mb-6">
              We are located at Al Mukaram Shopping Centre, Eastleigh, Nairobi, Kenya.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="mailto:support@umrahmarket.net"
                aria-label="Email Umrah Market"
                className="bg-gray-800 p-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Mail className="h-5 w-5" />
              </a>
              <a
                href="https://www.instagram.com/umrahmarket360"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Umrah Market on Instagram"
                className="bg-gray-800 p-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://www.tiktok.com/@umrahmarket360"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Umrah Market on TikTok"
                className="bg-gray-800 p-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <TikTokIcon className="h-5 w-5" />
              </a>
              <a
                href="https://x.com/umrahmarket360"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Umrah Market on X"
                className="bg-gray-800 p-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <XIcon className="h-5 w-5" />
              </a>
              <a
                href="https://www.youtube.com/@umrahmarket360"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Umrah Market on YouTube"
                className="bg-gray-800 p-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
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
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-bold mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-2">
                <Mail className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-400 break-words">support@umrahmarket.net</span>
              </li>
              <li className="flex items-start space-x-2">
                <Phone className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <a
                  href="https://wa.me/254700111106"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white"
                >
                  +254 700 111 106
                </a>
              </li>
              <li className="flex items-start space-x-2">
                <MapPin className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-400">Al Mukaram Shopping Centre, Eastleigh, Nairobi, Kenya.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm text-center md:text-left">
              © {new Date().getFullYear()} Umrah Market. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-white">Terms of Service</a>
              <a href="#" className="hover:text-white">Cookie Policy</a>
              <a href="#" className="hover:text-white">Sitemap</a>
            </div>
          </div>
        </div>
      </div>

      {/* Visitor ↔ Agent live chat — client-only, see the lazy import above */}
      {mounted && (
        <Suspense fallback={null}>
          <ChatWidget />
        </Suspense>
      )}

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