// src/seo/landingPagesConfig.js
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for every programmatic SEO landing page on the site.
// One config entry drives FOUR things automatically, so they can never drift
// out of sync with each other:
//   1. +data.js       — which packages get server-fetched/filtered for the page
//   2. +Head.jsx       — title, meta description, JSON-LD schema
//   3. LandingPage.jsx — H1, intro copy, FAQ block, breadcrumb
//   4. sitemap.xml      — generated straight from this list (see
//                         scripts/generate-sitemap.js)
//
// To add a new landing page: add one entry below. Nothing else needs to
// change. To retire one: delete the entry — it stops being linked, stops
// appearing in the sitemap, and +Head.jsx will 404 it on next deploy.
//
// IMPORTANT — this file must stay dependency-free (no api.js, no browser
// globals, no localStorage) because +data.js imports it and runs server-side
// in Node, same constraint that already applies to +data.js itself.
// ─────────────────────────────────────────────────────────────────────────────

// ── filter helpers ──────────────────────────────────────────────────────────
// All operate on an already-normalised package object (see +data.js's
// normalise() / packagesApi.js's normalise() — both spread the raw Supabase
// row first, so every raw column is present in addition to the normalised
// convenience fields used below).

const isUmrah = (p) => p.type !== 'hajj';
const isHajj  = (p) => p.type === 'hajj';
const includesMadinah = (p) => p.location !== 'makkah'; // legacy 3-tier bucket, set by CreatePackageModal

// Budget/luxury thresholds are a starting point, not a measured split of
// your actual price distribution — you only have a handful of live
// packages right now, so there's no real median to derive this from yet.
// Revisit these once there's enough inventory to look at actual price
// percentiles (e.g. bottom/top third of live Umrah packages) instead of a
// guessed KES figure.
const BUDGET_MAX_PRICE  = 200000; // KES — adjust once real pricing data exists
const LUXURY_MIN_PRICE  = 350000; // KES — adjust once real pricing data exists
const isBudget = (p) => isUmrah(p) && Number(p.price) > 0 && Number(p.price) <= BUDGET_MAX_PRICE;
const isLuxury = (p) => isUmrah(p) && Number(p.price) >= LUXURY_MIN_PRICE;

const alwaysTrue = () => true;

// ── config ───────────────────────────────────────────────────────────────────
// path: exact pathname, matched verbatim against pageContext.urlPathname.
//   Deliberately flat/literal (not /umrah-packages/:slug) — exact-match
//   keyword URLs perform better for this vertical and it avoids awkward
//   nesting like "/umrah-packages/umrah".
// filter: (normalisedPackage) => boolean — run against the full active
//   package list, same one the homepage already fetches.
// h1 / intro: real, unique copy per page — never templated boilerplate.
//   This is what keeps these from reading as thin/duplicate content to
//   Google; every intro below says something genuinely specific to that
//   page, not a find-and-replace of the same three sentences.
// faqs: optional — page-specific questions ADDED to the shared FAQS from
//   FaqSection.jsx (not a replacement), so every landing page still carries
//   the core trust/licensing FAQs that already work well on /guidance.
export const LANDING_PAGES = [
  {
    path: '/umrah-packages-kenya',
    filter: isUmrah,
    breadcrumbName: 'Umrah Packages Kenya',
    h1: 'Umrah Packages in Kenya',
    title: 'Umrah Packages in Kenya | Compare Verified Agents | UmrahMarket',
    metaDescription: 'Compare Umrah packages in Kenya from verified, IATA-accredited travel agents — real prices, hotel ratings, and inclusions side by side. No sales calls required to compare.',
    intro: "Every Umrah package on this page is listed directly by a verified Kenyan travel agent — licensed, tax-compliant, and IATA-accredited where required. Unlike a single agency's price list, you're comparing multiple agents' actual current offers side by side: hotel distance from the Haram, star rating, inclusions, and price, before you ever have to make a call or send a WhatsApp message.",
    keywords: 'umrah packages kenya, umrah packages in kenya, umra packages kenya, verified umrah agents kenya',
  },
  {
    path: '/hajj-packages-kenya',
    filter: isHajj,
    breadcrumbName: 'Hajj Packages Kenya',
    h1: 'Hajj Packages in Kenya',
    title: 'Hajj Packages in Kenya | Verified Hajj Agents | UmrahMarket',
    metaDescription: 'Compare Hajj packages in Kenya from verified, licensed Hajj operators. Fixed Dhul Hijjah dates, transparent pricing, and hotel details for every listed package.',
    intro: "Hajj travel from Kenya runs on fixed dates and limited visa quotas, so the agents listed here are the ones who've already gone through UmrahMarket's licensing and accreditation check — the same verification a pilgrim would otherwise have to do themselves, agency by agency. Compare Hajj packages by hotel distance in Mina/Makkah, inclusions, and price before booking.",
    keywords: 'hajj packages kenya, hajj package kenya 2027, verified hajj agents kenya',
  },
  {
    // Geo-modifier, not a separate inventory pool — see the note in
    // LandingPage.jsx about why Nairobi/Mombasa intentionally share the
    // same national package list as /umrah-packages-kenya rather than a
    // filtered subset: almost every Kenyan pilgrim departs via JKIA
    // regardless of home city, so a real geographic split would just
    // fragment the same handful of packages across thinner pages.
    path: '/umrah-packages-nairobi',
    filter: isUmrah,
    breadcrumbName: 'Umrah Packages Nairobi',
    h1: 'Umrah Packages for Nairobi Pilgrims',
    title: 'Umrah Packages from Nairobi | JKIA Departures | UmrahMarket',
    metaDescription: 'Umrah packages departing from Nairobi (JKIA) with verified Kenyan agents — many based in Eastleigh. Compare prices, hotels, and inclusions before booking.',
    intro: "Almost every Umrah trip from Kenya departs through Jomo Kenyatta International Airport, so this list covers the same verified agents as our main Kenya page — many with offices in Eastleigh, Nairobi's hub for pilgrimage travel agencies. If you're based in Nairobi and want an agent you can visit in person before booking, this is the shortest path to one.",
    keywords: 'umrah packages nairobi, umrah from nairobi, jkia umrah packages, eastleigh umrah agents',
  },
  {
    path: '/umrah-packages-mombasa',
    filter: isUmrah,
    breadcrumbName: 'Umrah Packages Mombasa',
    h1: 'Umrah Packages for Mombasa Pilgrims',
    title: 'Umrah Packages from Mombasa | Verified Agents | UmrahMarket',
    metaDescription: 'Umrah packages for pilgrims travelling from Mombasa, connecting through Nairobi with verified Kenyan travel agents. Compare prices and hotel details.',
    intro: "Mombasa has one of Kenya's largest Muslim communities, and pilgrims here typically connect through Nairobi for the international leg to Saudi Arabia. The agents below are verified the same way as everywhere else on UmrahMarket — licensing, tax compliance, and IATA accreditation checked before a listing goes live.",
    keywords: 'umrah packages mombasa, umrah from mombasa, mombasa hajj agents',
  },
  {
    path: '/budget-umrah-packages-kenya',
    filter: isBudget,
    breadcrumbName: 'Budget Umrah Packages',
    h1: 'Budget Umrah Packages in Kenya',
    title: 'Budget Umrah Packages in Kenya | Affordable & Verified | UmrahMarket',
    metaDescription: 'Affordable Umrah packages in Kenya from verified agents — compare budget-friendly hotel options and inclusions without sacrificing licensing checks.',
    intro: "Budget doesn't mean unverified — every package on this page has passed the same agent-licensing check as the premium listings, the difference is hotel distance from the Haram and room-sharing tier, not agency credibility. This is the list for pilgrims prioritising cost without gambling on an unlicensed operator.",
    keywords: 'budget umrah packages kenya, cheap umrah packages kenya, affordable umrah kenya',
  },
  {
    path: '/luxury-umrah-packages-kenya',
    filter: isLuxury,
    breadcrumbName: 'Luxury Umrah Packages',
    h1: 'Luxury Umrah Packages in Kenya',
    title: 'Luxury Umrah Packages in Kenya | 5-Star Hotels | UmrahMarket',
    metaDescription: 'Premium Umrah packages in Kenya with 5-star hotels close to the Haram, full-board meals, and guided ziyarat — compare verified agents\' top-tier offers.',
    intro: "These are the highest-tier packages currently listed on UmrahMarket — hotels within close walking distance of the Haram, full-board meals, and guided historical-site visits included as standard rather than an upsell. Compare them directly rather than relying on a single agency's premium sales pitch.",
    keywords: 'luxury umrah packages kenya, 5 star umrah kenya, premium umrah packages kenya',
  },
  {
    // Real filter, not a geo-modifier — the "with Madinah" split maps
    // directly to the `location` field CreatePackageModal already writes,
    // so unlike the city pages above, this genuinely narrows the list.
    path: '/umrah-packages-makkah-madinah',
    filter: includesMadinah,
    breadcrumbName: 'Makkah & Madinah Packages',
    h1: 'Umrah Packages Covering Makkah & Madinah',
    title: 'Umrah Packages: Makkah & Madinah | Verified Kenyan Agents | UmrahMarket',
    metaDescription: 'Umrah packages covering both Makkah and Madinah from verified Kenyan agents — compare hotel ratings and distance from both Haramain.',
    intro: "Some Umrah packages cover Makkah only; these include a Madinah leg as well, with the Prophet's Mosque visit built into the itinerary rather than left to the pilgrim to arrange separately. Every listed agent is verified the same way as the rest of UmrahMarket.",
    keywords: 'umrah packages makkah madinah, umrah makkah and madinah kenya, two city umrah package',
  },
];

// ── lookups ──────────────────────────────────────────────────────────────────

export function getLandingPageByPath(pathname) {
  return LANDING_PAGES.find((entry) => entry.path === pathname) || null;
}

export function filterPackagesForLandingPage(entry, packages = []) {
  if (!entry || !Array.isArray(packages)) return [];
  return packages.filter(entry.filter);
}
