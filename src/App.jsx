import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, MemoryRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import PackageDetailPage from './components/PackageDetailPage';
import Footer from './components/Footer';
import AgentDashboard from './components/AgentDashboard';
import ClientDashboard from './components/ClientDashboard';
import SuperAdminLogin from './components/SuperAdminLogin';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import GoogleCallback from './pages/GoogleCallback';
import GoogleDone from './pages/GoogleDone';
import { refreshToken, userStore, tokenStore, goTo, setNavigator } from './api';
import PaymentCallback from './pages/PaymentCallback';
import { getAllActivePackages, toggleFavourite, getFavourites, normalise } from './components/agent/packages/services/packagesApi';
import SuperAdminRegister from './components/SuperAdminRegister';
import GuidancePage from './components/GuidancePage';
import ExperiencesPage from './components/ExperiencesPage';
import VerifiedPage from './components/VerifiedPage';
import AgentsPage from './components/AgentsPage';
import AgentDetailPage from './components/AgentDetailPage';
import VerifyEmailPage from './components/VerifyEmailPage';
import { isEmailVerified } from './utils/emailVerification';
import Seo from './components/Seo';
import LandingPage from './components/LandingPage';
import { LANDING_PAGES } from './seo/landingPagesConfig.js';

// window.location.origin doesn't exist during SSR — guarded fallback to the
// real production origin so the Home route's Seo/jsonLd props (evaluated
// during render, not inside an effect) don't crash the server render.
const SITE_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'https://www.umrahmarket.net';
const getLocalStorageItem = (key) => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage.getItem(key);
};

const isTokenExpired = (token) => {
  try {
    const payload = token?.split('.')?.[1];
    if (!payload) return false;
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    const exp = Number(json?.exp || 0);
    if (!exp) return false;
    return Date.now() >= exp * 1000;
  } catch {
    return false;
  }
};

// ── Silent token refresh ──────────────────────────────────────────────────────
// Called once on app load. Uses the refreshToken function from api.js
// so the URL is always kept in sync with the rest of the API layer.
const initAuth = async () => {
  const storedToken = getLocalStorageItem('refresh_token');
  const storedUser = userStore.get();

  // Public pages don't need to probe auth when no user session exists.
  // This avoids noisy refresh calls from stale leftover tokens.
  if (!storedToken || !storedUser) {
    if (!storedUser) {
      tokenStore.clear();
    }
    return storedUser;
  }

  if (isTokenExpired(storedToken)) {
    tokenStore.clear();
    userStore.clear();
    return null;
  }

  try {
    const res = await refreshToken();
    const user = res?.data?.data?.user;
    if (user) userStore.set(user);
    return user || userStore.get();
  } catch {
    tokenStore.clear();
    userStore.clear();
    return null;
  }
};

// ── Route guards ──────────────────────────────────────────────────────────────
const ProtectedAgentRoute = ({ children, authReady }) => {
  const location = useLocation();
  if (!authReady) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="h-8 w-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  );
  const user = userStore.get();
  if (!user || user.role !== 'agent') return <Navigate to="/" state={{ from: location.pathname }} replace />;
  return children;
};

const ProtectedClientRoute = ({ children, authReady }) => {
  const location = useLocation();
  if (!authReady) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="h-8 w-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  );
  const user = userStore.get();
  if (!user || user.role !== 'client') {
    return <Navigate to="/" state={{ from: location.pathname }} replace />;
  }
  return children;
};

// ── Superadmin Route Protection ───────────────────────────────────────────────
const ProtectedSuperAdminRoute = ({ children, authReady }) => {
  const location = useLocation();
  if (!authReady) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="h-8 w-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
    </div>
  );
  const token = getLocalStorageItem('superadmin_token');
  const user = getLocalStorageItem('superadmin_user');
  if (!token || !user) return <Navigate to="/superadmin/login" state={{ from: location.pathname }} replace />;
  return children;
};

const getDashboardPath = (user) => {
  if (!user) return '/';
  return user.role === 'agent' ? '/agent/dashboard' : '/client/dashboard';
};

const HomeRoute = ({ authReady, currentUser, children }) => {
  if (!authReady) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="h-8 w-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  );
  if (currentUser) return <Navigate to={getDashboardPath(currentUser)} replace />;
  return children;
};

// ─────────────────────────────────────────────────────────────────────────────
// ── Navigation bridge ──────────────────────────────────────────────────────
// Registers this app's real useNavigate() with api.js so code outside React
// (the axios response interceptor) can trigger a proper SPA route change
// instead of window.location.href. Must render inside <Router> since
// useNavigate() requires router context; mounts before any route content,
// so the bridge is always ready before any request could possibly 401.
function NavigationBridge() {
  const navigate = useNavigate();
  useEffect(() => {
    setNavigator(navigate);
    return () => setNavigator(null);
  }, [navigate]);
  return null;
}

function App({
  initialPackages = null,
  initialAgents = null,
  initialAgent = null,
  initialPathname = '/',
  initialAuthReady = false,
}) {
  const [favorites,   setFavorites]   = useState([]); // array of package IDs
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady,   setAuthReady]   = useState(initialAuthReady); // true once initAuth completes

  // initialPackages comes from Vike's pages/+data.js server-side loader — only
  // populated when this is the very first render of '/' coming straight from
  // the server. Every other route (and every client-side navigation) leaves
  // this null, so behavior there is 100% unchanged from before.
  const [packages,   setPackages]   = useState(initialPackages ?? []);
  const [pkgLoading, setPkgLoading] = useState(!initialPackages);
  const [pkgError,   setPkgError]   = useState(null);

  const fetchPackages = useCallback(async () => {
    setPkgLoading(true);
    setPkgError(null);
    try {
      const data = await getAllActivePackages();
      const list = Array.isArray(data) ? data : (data.packages ?? data.data ?? []);
      setPackages(list.map(normalise));
    } catch (err) {
      setPkgError(err.message || 'Failed to load packages.');
    } finally {
      setPkgLoading(false);
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      // 1. Silently refresh token — runs on every page load/refresh
      const refreshedUser = await initAuth();

      // 2. Use refreshed user, or fall back to what's in localStorage
      const user = refreshedUser || userStore.get();
      if (user) setCurrentUser(user);

      // 3. Mark auth as ready — protected routes can now evaluate
      setAuthReady(true);

      // 4. Fetch public packages — skipped ONLY when Vike's SSR loader
      // already seeded the FULL list on the actual homepage (avoids a
      // flash of real content -> skeleton -> content right after hydration
      // on '/'). Landing pages (see landingPagesConfig.js) also arrive
      // with `initialPackages` seeded — but as a server-FILTERED subset,
      // not the full list — so they still need this fetch to run in the
      // background; otherwise `packages` state would stay stuck on that
      // narrow subset for the rest of the session, and every OTHER route
      // reached via client-side navigation would silently show the wrong,
      // too-narrow package list. LandingPage.jsx re-applies its own filter
      // to whatever `packages` it's handed, so it's correct both before
      // and after this fetch resolves.
      // NOTE: `!!initialPackages` used to be the check here, but arrays are
      // ALWAYS truthy in JS — including []. So when the SSR loader in
      // +data.js came back with a genuinely empty (or shape-mismatched)
      // result, `initialPackages` was `[]`, `!!initialPackages` was `true`,
      // and this permanently skipped the client-side fetchPackages() call
      // below — leaving the homepage stuck on zero packages for the rest of
      // the session with no retry. Checking .length actually distinguishes
      // "SSR successfully seeded real packages" from "SSR ran but got
      // nothing," so a bad/empty SSR response now correctly falls through
      // to the normal client-side fetch instead of getting stuck.
      const isHomepageSSR = initialPathname === '/' && Array.isArray(initialPackages) && initialPackages.length > 0;
      if (!isHomepageSSR) {
        fetchPackages();
      }
    };

    bootstrap();
  }, [fetchPackages, initialPackages, initialPathname]);

  const toggleFavorite = async (id) => {
    const user = currentUser || userStore.get();
    if (!user) return; // HeroSection/PackageDetailPage show auth modal before calling this

    // Optimistic update — flip immediately in UI
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );

    try {
      await toggleFavourite(id);
    } catch {
      // Revert on failure
      setFavorites(prev =>
        prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
      );
    }
  };

  // Load favourites from DB whenever a user logs in
  useEffect(() => {
    const user = currentUser || userStore.get();
    if (!user) { setFavorites([]); return; }
    getFavourites()
      .then(data => setFavorites((data.packageIds ?? []).map(String)))
      .catch(() => {}); // silently ignore — not critical
  }, [currentUser]);

  const handleLogout = useCallback(() => {
    tokenStore.clear();
    userStore.clear();
    setCurrentUser(null);
    goTo('/', { replace: true }, 'App.jsx:handleLogout');
  }, []);

  // ── Listen for token expiry fired by api.js interceptor ──────────────────
  useEffect(() => {
    const onExpired = () => {
      tokenStore.clear();
      userStore.clear();
      setCurrentUser(null);
      // Redirect happens inside api.js after 2.5 s; we just sync React state here
    };
    window.addEventListener('session:expired', onExpired);
    return () => window.removeEventListener('session:expired', onExpired);
  }, []);

  useEffect(() => {
    const onEmailVerified = () => {
      const refreshed = userStore.get();
      if (refreshed && isEmailVerified(refreshed)) {
        setCurrentUser(refreshed);
      }
    };
    window.addEventListener('auth:email-verified', onEmailVerified);
    return () => window.removeEventListener('auth:email-verified', onEmailVerified);
  }, []);

  // ── Inactivity timeout — log out after 30 min of no interaction ───────────
  useEffect(() => {
    const TIMEOUT = 30 * 60 * 1000; // 30 minutes
    let timer;

    const reset = () => {
      clearTimeout(timer);
      // Only start timer if a user is actually logged in
      if (userStore.get()) {
        timer = setTimeout(() => {
          handleLogout();
        }, TIMEOUT);
      }
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset(); // start on mount

    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [currentUser]); // restart timer when user changes

  const RouterComponent = typeof window === 'undefined' ? MemoryRouter : BrowserRouter;
  const routerProps = typeof window === 'undefined' ? { initialEntries: [initialPathname || '/'] } : {};

  return (
    <RouterComponent {...routerProps}>
      <NavigationBridge />
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Home */}
          <Route path="/" element={
            <HomeRoute authReady={authReady} currentUser={currentUser}>
              <>
                <Seo
                  title="UmrahMarket - Verified Umrah & Hajj Packages in Kenya"
                  description="Browse verified Umrah and Hajj packages from trusted Kenyan travel agents. Compare prices, hotels, durations, and agent credentials in one place."
                  canonical={`${SITE_ORIGIN}/`}
                  jsonLd={{
                    '@context': 'https://schema.org',
                    '@graph': [
                      {
                        '@type': 'WebSite',
                        name: 'UmrahMarket',
                        url: SITE_ORIGIN,
                      },
                      {
                        '@type': 'Organization',
                        name: 'UmrahMarket',
                        url: SITE_ORIGIN,
                        logo: `${SITE_ORIGIN}/umramarket1.png`,
                        image: `${SITE_ORIGIN}/umramarket1.png`,
                        description: 'Verified marketplace connecting pilgrims with licensed Umrah and Hajj travel agents in Kenya, Somalia, Tanzania, and Uganda.',
                        address: {
                          '@type': 'PostalAddress',
                          addressCountry: 'KE',
                        },
                        areaServed: ['Kenya', 'Somalia', 'Tanzania', 'Uganda'],
                        contactPoint: {
                          '@type': 'ContactPoint',
                          email: 'support@umrahmarket.net',
                          contactType: 'customer support',
                        },
                        sameAs: [
                          'https://www.instagram.com/umrahmarket360',
                          'https://www.tiktok.com/@umrahmarket360',
                          'https://x.com/umrahmarket360',
                          'https://www.youtube.com/@umrahmarket360',
                        ],
                      },
                    ],
                  }}
                />
                <Header
                  currentUser={currentUser}
                  onLogout={handleLogout}
                  onAuthSuccess={(user) => {
                    setCurrentUser(user);
                    userStore.set(user);
                  }}
                />
                <HeroSection
                  packages={packages}
                  loading={pkgLoading}
                  error={pkgError}
                  onRetry={fetchPackages}
                  favorites={favorites}
                  toggleFavorite={toggleFavorite}
                  currentUser={currentUser}
                  onAuthSuccess={(user) => {
                    setCurrentUser(user);
                    userStore.set(user);
                  }}
                />
                {initialPathname === '/' && (
                  <section className="border-t border-emerald-100/70 bg-white">
                    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-7">
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 px-4 sm:px-5 py-4 sm:py-5">
                        <h2 className="text-sm sm:text-base font-semibold text-gray-900">
                          Find verified Umrah packages in Kenya and Hajj packages in Kenya
                        </h2>
                        <p className="mt-1.5 text-sm text-gray-600 leading-relaxed max-w-4xl">
                          Compare package prices, hotel details in Makkah and Madinah, inclusions, and verified agent credentials in one place. Popular searches include umrah packages kenya and hajj package kenya.
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2.5">
                          <Link
                            to="/guidance"
                            className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            Umrah and Hajj guidance
                          </Link>
                          <Link
                            to="/agents"
                            className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            Browse verified agents
                          </Link>
                        </div>
                      </div>
                    </div>
                  </section>
                )}
                <Footer />
              </>
            </HomeRoute>
          } />

          {/* Detail */}
          <Route path="/umra-package/:slug/:id" element={
            <>
              <Header
                currentUser={currentUser}
                onLogout={handleLogout}
                onAuthSuccess={(user) => {
                  setCurrentUser(user);
                  userStore.set(user);
                }}
              />
              <PackageDetailPage
                packages={packages}
                loading={pkgLoading}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
                currentUser={currentUser}
                onAuthSuccess={(user) => {
                  setCurrentUser(user);
                  userStore.set(user);
                }}
              />
              <Footer />
            </>
          } />

          <Route path="/package/:id" element={
            <>
              <Header
                currentUser={currentUser}
                onLogout={handleLogout}
                onAuthSuccess={(user) => {
                  setCurrentUser(user);
                  userStore.set(user);
                }}
              />
              <PackageDetailPage
                packages={packages}
                loading={pkgLoading}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
                currentUser={currentUser}
                onAuthSuccess={(user) => {
                  setCurrentUser(user);
                  userStore.set(user);
                }}
              />
              <Footer />
            </>
          } />

          <Route path="/package/:id/:slug" element={
            <>
              <Header
                currentUser={currentUser}
                onLogout={handleLogout}
                onAuthSuccess={(user) => {
                  setCurrentUser(user);
                  userStore.set(user);
                }}
              />
              <PackageDetailPage
                packages={packages}
                loading={pkgLoading}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
                currentUser={currentUser}
                onAuthSuccess={(user) => {
                  setCurrentUser(user);
                  userStore.set(user);
                }}
              />
              <Footer />
            </>
          } />

          <Route path="/experiences" element={
            <>
              {/* ExperiencesPage.jsx renders its own <Seo> — kept as the
                  single source of truth for this route's meta tags. */}
              <Header
                currentUser={currentUser}
                onLogout={handleLogout}
                onAuthSuccess={(user) => {
                  setCurrentUser(user);
                  userStore.set(user);
                }}
              />
              <ExperiencesPage />
              <Footer />
            </>
          } />

          <Route path="/agent/dashboard" element={
            <ProtectedAgentRoute authReady={authReady}>
              <AgentDashboard user={currentUser} onLogout={handleLogout} />
              <Footer />
            </ProtectedAgentRoute>
          } />

          <Route path="/superadmin/register" element={
            <>
              <SuperAdminRegister />
              <Footer />
            </>
          } />

          <Route path="/client/dashboard" element={
            <ProtectedClientRoute authReady={authReady}>
              <ClientDashboard user={currentUser} onLogout={handleLogout} packages={packages} />
              <Footer />
            </ProtectedClientRoute>
          } />

          <Route path="/guidance" element={
            <>
              {/* GuidancePage.jsx renders its own <Seo> — kept as the
                  single source of truth for this route's meta tags. */}
              <GuidancePage />
              <Footer />
            </>
          } />

          <Route path="/agents" element={
            <>
              {/* AgentsPage.jsx renders its own <Seo> — kept as the
                  single source of truth for this route's meta tags. */}
              <Header
                currentUser={currentUser}
                onLogout={handleLogout}
                onAuthSuccess={(user) => {
                  setCurrentUser(user);
                  userStore.set(user);
                }}
              />
              <AgentsPage initialAgents={initialAgents} />
              <Footer />
            </>
          } />
          <Route path="/agents/:id" element={
            <>
              <Header
                currentUser={currentUser}
                onLogout={handleLogout}
                onAuthSuccess={(user) => {
                  setCurrentUser(user);
                  userStore.set(user);
                }}
              />
              <AgentDetailPage initialAgent={initialAgent} />
              <Footer />
            </>
          } />

          {/* Programmatic SEO landing pages — one Route per entry in
              landingPagesConfig.js, generated here so adding/removing a
              config entry never requires touching this file. Each shares
              the exact same props HeroSection gets on the homepage;
              LandingPage.jsx applies that config entry's own filter to
              whatever `packages` it's handed (the SSR-narrowed initial set,
              then the full list once the background fetch above resolves)
              so the grid stays correct through both stages. */}
          {LANDING_PAGES.map((entry) => (
            <Route key={entry.path} path={entry.path} element={
              <>
                <Header
                  currentUser={currentUser}
                  onLogout={handleLogout}
                  onAuthSuccess={(user) => {
                    setCurrentUser(user);
                    userStore.set(user);
                  }}
                />
                <LandingPage
                  packages={packages}
                  loading={pkgLoading}
                  error={pkgError}
                  onRetry={fetchPackages}
                  favorites={favorites}
                  toggleFavorite={toggleFavorite}
                  currentUser={currentUser}
                  onAuthSuccess={(user) => {
                    setCurrentUser(user);
                    userStore.set(user);
                  }}
                />
                <Footer />
              </>
            } />
          ))}

          {/* Google OAuth popup routes — deliberately NO <Footer />. These render
              inside the small popup window, not the main tab, and are meant to
              close themselves (see GoogleCallback.jsx / GoogleDone.jsx). Site
              chrome here just flashes uselessly right before window.close(). */}
          <Route path="/auth/google/callback" element={<GoogleCallback />} />
          <Route path="/auth/google/done" element={<GoogleDone />} />
          <Route path="/verified" element={
            <>
              {/* VerifiedPage.jsx renders its own <Seo> — kept as the
                  single source of truth for this route's meta tags. */}
              <VerifiedPage />
              <Footer />
            </>
          } />
          <Route path="/verify-email" element={
            <>
              <VerifyEmailPage />
              <Footer />
            </>
          } />
          {/* FIX: packageId is in the path so Pesapal can't stomp it on redirect.
              No <Footer /> here either — same reasoning as the Google OAuth
              routes above: this tab is meant to self-close via
              PaymentCallback.jsx's window.close(), so site chrome would just
              flash uselessly first. */}
          <Route path="/payment/callback/:packageId" element={<PaymentCallback />} />
          {/* Fallback: if PESAPAL_CALLBACK_URL is ever misconfigured without the
              packageId segment, still hit the verify page instead of falling
              through to "*" → homepage. PaymentCallback already falls back to
              the packageId stored in localStorage in this case. */}
          <Route path="/payment/callback" element={<PaymentCallback />} />

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* SUPERADMIN ROUTES - Restricted Access                             */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          <Route path="/superadmin/login" element={
            <>
              <SuperAdminLogin />
              {/* <Footer /> */}
            </>
          } />

          <Route path="/superadmin/dashboard" element={
            <ProtectedSuperAdminRoute authReady={authReady}>
              <SuperAdminDashboard />
              {/* <Footer /> */}
            </ProtectedSuperAdminRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </RouterComponent>
  );
}

export default App;