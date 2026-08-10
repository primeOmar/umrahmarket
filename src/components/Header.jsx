import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Menu,
  X,
  User,
  Shield,
  Sparkles,
  Briefcase,
  Compass,
  Globe,
  BookOpen,
  Users,
} from 'lucide-react';
import logoImage from '../assets/umramarket.png';
import AuthModal from './AuthModal';

const Header = ({ currentUser, onLogout, onAuthSuccess }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navigationItems = [
    {
      label: 'Packages',
      path: '/',
      icon: <Briefcase className="h-4 w-4" />,
      activeIcon: <Briefcase className="h-4 w-4" />,
    },
    {
      label: 'Experiences',
      path: '/experiences',
      icon: <Compass className="h-4 w-4" />,
      activeIcon: <Globe className="h-4 w-4" />,
    },
    {
      label: 'Guidance',
      path: '/guidance',
      icon: <BookOpen className="h-4 w-4" />,
      activeIcon: <BookOpen className="h-4 w-4" fill="currentColor" />,
    },
    {
      label: 'Agents',
      path: '/agents',
      icon: <Users className="h-4 w-4" />,
      activeIcon: <Users className="h-4 w-4" fill="currentColor" />,
    },
  ];

  // Exact match first ('/' only matches '/'), then prefix match for nested
  // routes like /agents/:id so the "Agents" tab stays lit on an agent's
  // detail page instead of silently falling back to whatever the previous
  // tab was.
  const getMatchingNavLabel = (pathname) => {
    const exact = navigationItems.find((i) => i.path === pathname);
    if (exact) return exact.label;
    const prefix = navigationItems.find((i) => i.path !== '/' && pathname.startsWith(`${i.path}/`));
    return prefix ? prefix.label : null;
  };

  const [isScrolled, setIsScrolled] = useState(false);
  const [activeNav, setActiveNav] = useState(() => getMatchingNavLabel(location.pathname) || 'Packages');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // Close the auth modal as soon as a user is present (login completed)
  useEffect(() => {
    if (currentUser) setShowAuthModal(false);
  }, [currentUser]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const goToNav = (item) => {
    setActiveNav(item.label);
  };

  // Hamburger click — ALWAYS opens/closes the nav drawer. No auth check here,
  // ever. Signing in/out is handled separately inside the drawer itself.
  const toggleMobileMenu = () => setMobileMenuOpen((v) => !v);

  // Keep the highlighted tab in sync with the actual URL (covers direct
  // links, refresh, browser back/forward, and nested routes like /agents/:id
  // — not just in-app clicks).
  useEffect(() => {
    const match = getMatchingNavLabel(location.pathname);
    if (match) setActiveNav(match);
  }, [location.pathname]);

  return (
    <>
      {/* ── HEADER ───────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border-b border-gray-100'
            : 'bg-white border-b border-gray-100'
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* ── Logo ── */}
            <div className="flex-shrink-0">
              <Link to="/">
                <img
                  src={logoImage}
                  alt="Umrah Market Logo"
                  className="h-8 sm:h-9 w-auto cursor-pointer hover:opacity-90 transition-opacity duration-300"
                />
              </Link>
            </div>

            {/* ── Desktop Nav (centered, lg+) ── */}
            <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2">
              <div className="flex space-x-1 bg-gray-50/80 backdrop-blur-sm rounded-2xl p-1.5 border border-gray-200/60 shadow-sm">
                {navigationItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.path}
                    onClick={() => goToNav(item)}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                      activeNav === item.label
                        ? 'bg-white text-emerald-700 shadow-lg shadow-emerald-100/50 border border-emerald-100/30'
                        : 'text-gray-600 hover:text-emerald-600 hover:bg-white/50'
                    }`}
                  >
                    <span className={activeNav === item.label ? 'text-emerald-600' : 'text-gray-400'}>
                      {activeNav === item.label ? item.activeIcon : item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </nav>

            {/* ── Right actions ── */}
            <div className="flex items-center gap-2">

              {/* Verified badge — lg+ only */}
              <Link
                to="/verified"
                className="hidden lg:flex items-center px-3 py-2 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50/50 border border-emerald-100/50 hover:border-emerald-300 hover:from-emerald-100 hover:to-teal-100/60 transition-all duration-300 cursor-pointer"
              >
                <Shield className="h-3.5 w-3.5 text-emerald-600 mr-1.5" />
                <span className="text-xs font-semibold text-emerald-700">Verified</span>
                <Sparkles className="h-3 w-3 ml-1 text-emerald-500 opacity-60" />
              </Link>

              {/* Search — desktop */}
              <button className="hidden lg:flex items-center justify-center h-9 w-9 rounded-full hover:bg-gray-100 transition-all duration-300 group">
                <Search className="h-4 w-4 text-gray-500 group-hover:text-emerald-600 transition-colors" />
              </button>

              {/* Search toggle — mobile/tablet */}
              <button
                onClick={() => setShowMobileSearch((v) => !v)}
                className="lg:hidden flex items-center justify-center h-9 w-9 rounded-full hover:bg-gray-100 transition-all duration-300"
                aria-label="Toggle search"
              >
                {showMobileSearch
                  ? <X className="h-4 w-4 text-gray-500" />
                  : <Search className="h-4 w-4 text-gray-500" />}
              </button>

              {/* Account button — sm+ (tablet shows this, not the hamburger) */}
              {currentUser ? (
                <button
                  onClick={() => {
                    if (currentUser.role === 'agent') navigate('/agent/dashboard');
                    else navigate('/client/dashboard');
                  }}
                  className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full border border-emerald-200 bg-gradient-to-r from-emerald-50/70 to-teal-50/70 hover:shadow-md transition-all duration-300 group"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {currentUser.firstName?.charAt(0) || currentUser.name?.charAt(0) || 'U'}
                  </div>
                  <span className="hidden lg:inline text-sm font-semibold text-emerald-700 max-w-[100px] truncate">
                    {currentUser.firstName || currentUser.name || 'Account'}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 hover:border-emerald-200 hover:shadow-md hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-teal-50/50 transition-all duration-300 group"
                  aria-label="Sign in"
                >
                  <div className="p-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm">
                    <User className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="hidden lg:inline text-sm font-medium text-gray-700 group-hover:text-emerald-700">
                    Account
                  </span>
                </button>
              )}

              {/* Hamburger — xs/mobile ONLY (sm:hidden). This is the sole
                  place the Menu/X icon appears. Opens the nav drawer, full
                  stop — never calls setShowAuthModal, regardless of login
                  state. Fully independent of the Account button above,
                  which is hidden on mobile (hidden sm:flex) and only ever
                  opens the login modal. */}
              <button
                type="button"
                onClick={toggleMobileMenu}
                className="sm:hidden flex items-center justify-center h-9 w-9 rounded-full border border-gray-200 hover:bg-gray-50 transition-all duration-300"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen
                  ? <X className="h-4 w-4 text-gray-600" />
                  : <Menu className="h-4 w-4 text-gray-600" />}
              </button>
            </div>
          </div>

          {/* ── Expandable mobile search ── */}
          <div
            className={`lg:hidden overflow-hidden transition-all duration-300 ${
              showMobileSearch ? 'max-h-16 pb-3 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search Umrah packages..."
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all duration-300"
              />
            </div>
          </div>
        </div>

      </header>

      {/* ── Tablet bottom nav (sm → lg) ── */}
      <div className="hidden sm:flex lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.07)]">
        <div className="flex justify-around w-full px-2 py-2">
          {navigationItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              onClick={() => goToNav(item)}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 rounded-xl transition-all duration-300 ${
                activeNav === item.label ? 'text-emerald-600' : 'text-gray-400 hover:text-emerald-500'
              }`}
            >
              <div>{activeNav === item.label ? item.activeIcon : item.icon}</div>
              <span className={`text-[10px] mt-0.5 font-semibold ${
                activeNav === item.label ? 'text-emerald-600' : 'text-gray-400'
              }`}>
                {item.label}
              </span>
              {activeNav === item.label && (
                <div className="h-0.5 w-5 mt-1 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" />
              )}
            </Link>
          ))}
          <button
            onClick={() => currentUser
              ? navigate(currentUser.role === 'agent' ? '/agent/dashboard' : '/client/dashboard')
              : setShowAuthModal(true)
            }
            className="flex flex-col items-center justify-center flex-1 py-1.5 rounded-xl text-gray-400 hover:text-emerald-500 transition-all duration-300"
          >
            {currentUser ? (
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white text-[10px] font-bold">
                {currentUser.firstName?.charAt(0) || currentUser.name?.charAt(0) || 'U'}
              </div>
            ) : (
              <User className="h-4 w-4" />
            )}
            <span className={`text-[10px] mt-0.5 font-semibold ${currentUser ? 'text-emerald-600' : ''}`}>
              {currentUser ? (currentUser.firstName || 'Me') : 'Account'}
            </span>
          </button>
        </div>
      </div>

      {/* ── Mobile slide-in drawer ── */}
      {/* Backdrop */}
      <div
        className={`sm:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Drawer panel */}
      <div
        className={`sm:hidden fixed top-0 right-0 z-50 h-full w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <img src={logoImage} alt="Umrah Market" className="h-7 w-auto" />
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {navigationItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              onClick={() => { goToNav(item); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeNav === item.label
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-emerald-600'
              }`}
            >
              <span className={activeNav === item.label ? 'text-emerald-600' : 'text-gray-400'}>
                {activeNav === item.label ? item.activeIcon : item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Drawer footer */}
        <div className="px-4 py-5 border-t border-gray-100 space-y-3">
          <Link
            to="/verified"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors duration-200"
          >
            <Shield className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">Verified Platform</span>
            <Sparkles className="h-3.5 w-3.5 text-emerald-400 ml-auto" />
          </Link>
          {currentUser ? (
            <button
              onClick={() => { setMobileMenuOpen(false); onLogout?.(); }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-white text-sm font-semibold shadow-md hover:from-red-600 hover:to-rose-600 transition-all duration-300"
            >
              <User className="h-4 w-4" />
              Sign Out
            </button>
          ) : (
            <button
              onClick={() => { setMobileMenuOpen(false); setShowAuthModal(true); }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold shadow-md shadow-emerald-200 hover:from-emerald-600 hover:to-teal-600 transition-all duration-300"
            >
              <User className="h-4 w-4" />
              Sign In / Register
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile bottom nav bar ── */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.07)]">
        <div className="flex justify-around px-2 py-2">
          {navigationItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              onClick={() => goToNav(item)}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 rounded-xl transition-all duration-300 ${
                activeNav === item.label ? 'text-emerald-600' : 'text-gray-400 hover:text-emerald-500'
              }`}
            >
              <div>{activeNav === item.label ? item.activeIcon : item.icon}</div>
              <span className={`text-[10px] mt-0.5 font-semibold ${
                activeNav === item.label ? 'text-emerald-600' : 'text-gray-400'
              }`}>
                {item.label}
              </span>
              {activeNav === item.label && (
                <div className="h-0.5 w-5 mt-1 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" />
              )}
            </Link>
          ))}

          {/* Account in bottom nav */}
          <button
            onClick={() => currentUser
              ? navigate(currentUser.role === 'agent' ? '/agent/dashboard' : '/client/dashboard')
              : setShowAuthModal(true)
            }
            className="flex flex-col items-center justify-center flex-1 py-1.5 rounded-xl text-gray-400 hover:text-emerald-500 transition-all duration-300"
          >
            {currentUser ? (
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white text-[10px] font-bold">
                {currentUser.firstName?.charAt(0) || currentUser.name?.charAt(0) || 'U'}
              </div>
            ) : (
              <User className="h-4 w-4" />
            )}
            <span className={`text-[10px] mt-0.5 font-semibold ${currentUser ? 'text-emerald-600' : ''}`}>
              {currentUser ? (currentUser.firstName || 'Me') : 'Account'}
            </span>
          </button>
        </div>
      </div>

      {/* ── Auth Modal ── */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100]">
          <AuthModal
            onClose={() => setShowAuthModal(false)}
            onAuthSuccess={(user) => {
              setShowAuthModal(false);
              // Update App-level state immediately — no refresh needed
              onAuthSuccess?.(user);
              const targetUrl =
                user?.role === 'agent'
                  ? '/agent/dashboard?welcome=true'
                  : '/client/dashboard?welcome=true';
              navigate(targetUrl);
            }}
          />
        </div>
      )}
    </>
  );
};

export default Header;