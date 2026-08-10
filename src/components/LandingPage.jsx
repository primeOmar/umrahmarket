// src/components/LandingPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Renders every programmatic SEO landing page defined in
// src/seo/landingPagesConfig.js — one component, driven entirely by the
// matched config entry for the current path. Deliberately thin: supplies the
// unique H1/intro/breadcrumb/FAQ content that keeps each page from reading as
// thin/duplicate content, then hands the actual package grid, filtering UI,
// favoriting, and booking flow off to the EXISTING HeroSection component
// (its own default H1 suppressed via `hideDefaultIntro`), so none of that
// logic gets forked or duplicated here.
//
// IMPORTANT: this always applies `entry.filter` itself to whatever
// `packages` prop it receives — it never assumes the list handed to it is
// already filtered. That's not redundant: App.jsx seeds this component with
// a server-FILTERED subset on first SSR paint, then replaces `packages`
// with the FULL list once its background fetch resolves (see App.jsx's
// bootstrap effect) — this component has to re-filter either way for the
// grid to stay correct through both stages.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import HeroSection from './HeroSection';
import FaqSection, { FAQS as SHARED_FAQS } from './FaqSection';
import Seo from './Seo';
import { createPackagePath } from '../utils/packageSeo';
import { getLandingPageByPath, filterPackagesForLandingPage, LANDING_PAGES } from '../seo/landingPagesConfig.js';

// Same fallback pattern App.jsx itself uses — window.location.origin isn't
// available during SSR.
const SITE_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'https://www.umrahmarket.net';

const buildJsonLd = (entry, packages, canonical, faqs) => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'CollectionPage',
      name: entry.h1,
      description: entry.metaDescription,
      url: canonical,
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: packages.slice(0, 20).map((pkg, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE_ORIGIN}${createPackagePath(pkg)}`,
          name: pkg.title || pkg.name || 'Umrah Package',
        })),
      },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_ORIGIN },
        { '@type': 'ListItem', position: 2, name: entry.breadcrumbName, item: canonical },
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ],
});

const LandingPage = (heroSectionProps) => {
  const location = useLocation();
  const entry = getLandingPageByPath(location.pathname);

  // Shouldn't normally happen (App.jsx only registers Routes for known
  // config paths), but fail safe rather than rendering a blank page if a
  // route/config entry ever drift apart.
  if (!entry) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-2 text-gray-600">
          <Link to="/" className="text-emerald-600 font-semibold">Browse all Umrah &amp; Hajj packages</Link>
        </p>
      </div>
    );
  }

  // Always re-filter — see file header comment for why this can't assume
  // the incoming list is already the right subset.
  const allPackages = heroSectionProps.packages || [];
  const packages = filterPackagesForLandingPage(entry, allPackages);

  const faqs = [...(entry.faqs || []), ...SHARED_FAQS];
  const canonical = `${SITE_ORIGIN}${entry.path}`;

  // Same rolling-year treatment as +Head.jsx's SSR title for these two —
  // kept in sync deliberately (see that file's comment for why it's
  // computed here rather than baked into the static config).
  const year = new Date().getFullYear();
  const yearSuffix = (entry.path === '/umrah-packages-kenya' || entry.path === '/hajj-packages-kenya')
    ? ` ${year}`
    : '';
  const title = entry.title.replace(' | ', `${yearSuffix} | `);

  // Other landing pages, minus this one — internal cross-linking so none
  // of these pages are orphaned (a page with zero internal links pointing
  // to it is close to invisible to a crawler no matter how good its own
  // content is) and so link equity flows between them instead of only
  // ever pointing back at the homepage.
  const otherPages = LANDING_PAGES.filter((p) => p.path !== entry.path);

  return (
    <>
      <Seo
        title={title}
        description={entry.metaDescription}
        canonical={canonical}
        jsonLd={buildJsonLd(entry, packages, canonical, faqs)}
      />

      {/* Breadcrumb — visible nav, mirrors the BreadcrumbList JSON-LD above. */}
      <nav className="container mx-auto px-4 sm:px-6 pt-4 text-xs text-gray-500" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-emerald-600">Home</Link>
        <span className="mx-1.5">/</span>
        <span className="text-gray-700 font-medium">{entry.breadcrumbName}</span>
      </nav>

      {/* Unique H1 + intro — this, not the generic homepage copy, is what
          keeps each landing page from reading as a templated duplicate. */}
      <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-b border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 text-center">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
            {entry.h1}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
            {entry.intro}
          </p>
        </div>
      </div>

      {/* Package grid, filters, favoriting, booking — all delegated to the
          existing HeroSection, seeded with the re-filtered list. */}
      <HeroSection {...heroSectionProps} packages={packages} hideDefaultIntro />

      {/* Empty-inventory fallback — matches the noindex,follow +Head.jsx
          applies in this same situation server-side, so a visitor sees an
          honest, still-useful state rather than a silent empty grid. */}
      {packages.length === 0 && !heroSectionProps.loading && (
        <div className="container mx-auto px-4 py-10 text-center">
          <p className="text-gray-600">
            No packages currently match this page — check back soon, or{' '}
            <Link to="/" className="text-emerald-600 font-semibold">browse all verified packages</Link>.
          </p>
        </div>
      )}

      <FaqSection faqs={faqs} />

      {/* Internal cross-links between landing pages */}
      <div className="border-t border-gray-100 bg-white">
        <div className="container mx-auto px-4 sm:px-6 py-8">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Explore more packages
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {otherPages.map((p) => (
              <Link key={p.path} to={p.path} className="text-emerald-700 hover:text-emerald-800 hover:underline">
                {p.breadcrumbName}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default LandingPage;