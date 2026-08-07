import React from 'react';
import { usePageContext } from 'vike-react/usePageContext';
import { createPackagePath } from '../src/utils/packageSeo';

// window.location.origin doesn't exist server-side, so the canonical host is
// hardcoded here (confirmed: umrahmarket.net redirects to this www host).
const SITE_ORIGIN = 'https://www.umrahmarket.net';

const toAbsolute = (pathname) => `${SITE_ORIGIN}${pathname}`;

const getPathPackageId = (pathname = '') => {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'umra-package' && parts[2]) return parts[2];
  if (parts[0] === 'package' && parts[1]) return parts[1];
  return null;
};

// '/agents/:id' — but NOT '/agents' itself (list route, no id segment).
const getPathAgentId = (pathname = '') => {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'agents' && parts[1]) return parts[1];
  return null;
};

const getPathPackageTitle = (packageData = {}) => packageData.title || packageData.name || 'Umrah Package';

const buildPackageDescription = (packageData = {}) => {
  const title = getPathPackageTitle(packageData);
  const agent = packageData.agent_name || packageData.agency_name || packageData.agency;
  const price = packageData.price ? `$${Number(packageData.price).toLocaleString('en-US')}` : null;
  const duration = packageData.duration ? `${packageData.duration}-day` : null;
  const location = packageData.location ? String(packageData.location).replace(/_/g, ' ') : null;
  const type = packageData.type === 'hajj' ? 'Hajj' : 'Umrah';

  return [
    `${title} from UmrahMarket`,
    [duration, location, packageData.makkah_hotel_rating ? `${packageData.makkah_hotel_rating}★ hotel` : null].filter(Boolean).join(' · '),
    price ? `From ${price} per person` : null,
    agent ? `Verified by ${agent}` : null,
    `Compare trusted ${type.toLowerCase()} packages in Kenya with hotels, inclusions, and agent details.`,
  ].filter(Boolean).join(' · ').slice(0, 220);
};

const getAgentName = (agent = {}) =>
  agent.businessName || `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || 'Verified Agent';

const buildAgentDescription = (agent = {}) => {
  const name = getAgentName(agent);
  const years = typeof agent.yearsExperience === 'number' && agent.yearsExperience > 0
    ? `${agent.yearsExperience} years of experience`
    : null;
  const verified = (agent.verificationStatus === 'verified' || agent.verificationStatus === 'approved')
    ? 'Verified on UmrahMarket'
    : null;
  const specialties = Array.isArray(agent.specialties) && agent.specialties.length
    ? agent.specialties.slice(0, 3).join(', ')
    : null;

  return [
    `${name} — Umrah and Hajj travel agent in Kenya`,
    years,
    specialties,
    verified,
    'Compare verified Umrah and Hajj packages, licences, and agent credentials on UmrahMarket.',
  ].filter(Boolean).join(' · ').slice(0, 220);
};

// Reusable BreadcrumbList builder — every entry is { name, path }, path
// relative (toAbsolute() applied here so callers never have to remember to).
const buildBreadcrumbJsonLd = (crumbs = []) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((crumb, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: crumb.name,
    item: toAbsolute(crumb.path),
  })),
});

const buildHomeJsonLd = () => ({
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', name: 'UmrahMarket', url: SITE_ORIGIN, potentialAction: { '@type': 'SearchAction', target: `${SITE_ORIGIN}/?q={search_term_string}`, 'query-input': 'required name=search_term_string' } },
    {
      '@type': 'Organization',
      name: 'UmrahMarket',
      url: SITE_ORIGIN,
      logo: `${SITE_ORIGIN}/umramarket1.png`,
      image: `${SITE_ORIGIN}/umramarket1.png`,
      description: 'Verified marketplace connecting pilgrims with licensed Umrah and Hajj travel agents in Kenya.',
      address: { '@type': 'PostalAddress', addressCountry: 'KE' },
      areaServed: ['Kenya', 'Somalia', 'Tanzania', 'Uganda'],
      contactPoint: { '@type': 'ContactPoint', email: 'support@umrahmarket.net', contactType: 'customer support' },
      sameAs: [
        'https://www.instagram.com/umrahmarket360',
        'https://www.tiktok.com/@umrahmarket360',
        'https://x.com/umrahmarket360',
        'https://www.youtube.com/@umrahmarket360',
      ],
    },
  ],
});

export default function Head() {
  const pageContext = usePageContext();
  const pathname = pageContext.urlPathname || '/';
  const packageData = pageContext.data?.package || pageContext.data?.packages?.[0] || null;
  const agentData = pageContext.data?.agent || null;

  if (pathname === '/') {
    const title = 'Umrah Packages in Kenya | Hajj Packages in Kenya | UmrahMarket';
    const description = 'Compare verified Umrah packages in Kenya and Hajj packages in Kenya from trusted travel agents. Browse prices, hotel ratings, inclusions, and agent credentials in one place.';

    return (
      <>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content="umrah packages in kenya, hajj packages in kenya, umra packages kenya, verified umrah agents kenya, hajj agents kenya" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`${SITE_ORIGIN}/`} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="UmrahMarket" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={`${SITE_ORIGIN}/umramarket1.png`} />
        <meta property="og:url" content={`${SITE_ORIGIN}/`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={`${SITE_ORIGIN}/umramarket1.png`} />
        <script id="seo-json-ld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildHomeJsonLd()) }} />
      </>
    );
  }

  if (packageData && getPathPackageId(pathname)) {
    const title = `${getPathPackageTitle(packageData)} | ${packageData.type === 'hajj' ? 'Hajj Package in Kenya' : 'Umrah Package in Kenya'} | UmrahMarket`;
    const description = buildPackageDescription(packageData);
    const image = packageData.image || packageData.images?.[0] || `${SITE_ORIGIN}/umramarket1.png`;
    const canonicalPath = createPackagePath(packageData);
    const canonical = toAbsolute(canonicalPath);
    const typeLabel = packageData.type === 'hajj' ? 'Hajj' : 'Umrah';

    const productSchema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: getPathPackageTitle(packageData),
      description,
      image: Array.isArray(packageData.images) ? packageData.images : [image],
      url: canonical,
      brand: { '@type': 'Brand', name: 'UmrahMarket' },
      offers: packageData.price ? {
        '@type': 'Offer',
        priceCurrency: 'USD',
        price: String(packageData.price),
        availability: 'https://schema.org/InStock',
        url: canonical,
      } : undefined,
      provider: packageData.agent_name ? { '@type': 'Organization', name: packageData.agent_name } : undefined,
    };

    const breadcrumbSchema = buildBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: `${typeLabel} Packages`, path: '/' },
      { name: getPathPackageTitle(packageData), path: canonicalPath },
    ]);

    return (
      <>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={`${packageData.type === 'hajj' ? 'hajj package kenya' : 'umrah package kenya'}, umrah packages kenya, hajj packages kenya, verified travel agents kenya`} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="product" />
        <meta property="og:site_name" content="UmrahMarket" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={image} />
        <meta property="og:url" content={canonical} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={image} />
        <script id="seo-json-ld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
        <script id="seo-json-ld-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      </>
    );
  }

  // '/agents/:id' — checked BEFORE the plain '/agents' list branch below,
  // and gated on agentData actually being present (SSR fetch succeeded);
  // if it's null (fetch failed, or a stale-cache edge case), this falls
  // through and AgentDetailPage.jsx's own client-side <Seo> still covers
  // it after hydration, same as before this change existed.
  if (agentData && getPathAgentId(pathname)) {
    const name = getAgentName(agentData);
    const title = `${name} | Verified Umrah Agent in Kenya | UmrahMarket`;
    const description = buildAgentDescription(agentData);
    const image = agentData.logoUrl || `${SITE_ORIGIN}/umramarket1.png`;
    const canonical = toAbsolute(`/agents/${agentData.id}`);
    const isVerified = agentData.verificationStatus === 'verified' || agentData.verificationStatus === 'approved';

    const agentSchema = {
      '@context': 'https://schema.org',
      '@type': 'TravelAgency',
      name,
      url: canonical,
      image: agentData.logoUrl || undefined,
      telephone: agentData.phone || undefined,
      sameAs: agentData.websiteUrl ? [agentData.websiteUrl] : undefined,
      areaServed: ['Kenya', 'Somalia', 'Tanzania', 'Uganda'],
    };

    const breadcrumbSchema = buildBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Verified Agents', path: '/agents' },
      { name, path: `/agents/${agentData.id}` },
    ]);

    return (
      <>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={`${name}, verified umrah agent kenya, hajj travel agent kenya, umrah agency kenya`} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="profile" />
        <meta property="og:site_name" content="UmrahMarket" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={image} />
        <meta property="og:url" content={canonical} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={image} />
        {isVerified && <meta name="umrahmarket:verified" content="true" />}
        <script id="seo-json-ld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(agentSchema) }} />
        <script id="seo-json-ld-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      </>
    );
  }

  if (pathname === '/agents') {
    const title = 'Verified Umrah Agents in Kenya | Hajj Travel Agents | UmrahMarket';
    const description = 'Browse verified Umrah and Hajj travel agents in Kenya, compare reviews, and choose trusted agencies for your pilgrimage.';

    return (
      <>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content="verified umrah agents kenya, hajj travel agents kenya, umrah travel agency kenya" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`${SITE_ORIGIN}/agents`} />
      </>
    );
  }

  if (pathname === '/guidance') {
    const title = 'Hajj and Umrah Guidance | Kenya Pilgrimage Guide | UmrahMarket';
    const description = 'Learn how to perform Umrah and Hajj with step-by-step guidance, videos, and practical travel tips for pilgrims from Kenya.';

    return (
      <>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content="hajj and umrah guide, umrah guide kenya, hajj guide kenya" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`${SITE_ORIGIN}/guidance`} />
      </>
    );
  }

  // New — previously fell through to `return null`, leaving these two
  // pages with zero SSR meta tags (only the client-side <Seo> effect,
  // invisible until after hydration).
  if (pathname === '/experiences') {
    const title = 'Umrah & Hajj Experiences in Kenya | UmrahMarket';
    const description = 'Explore curated Umrah and Hajj experiences from verified Kenyan travel agents — guided tours, group journeys, and premium pilgrimage packages.';

    return (
      <>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content="umrah experiences kenya, hajj experiences kenya, guided umrah tours kenya" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`${SITE_ORIGIN}/experiences`} />
      </>
    );
  }

  if (pathname === '/verified') {
    const title = 'Verification & Trust Documents | UmrahMarket Kenya';
    const description = "Review UmrahMarket's company, tax, and travel verification documents before booking with confidence.";

    return (
      <>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content="licensed umrah agency kenya, verified hajj operator kenya, umrah market trust" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`${SITE_ORIGIN}/verified`} />
      </>
    );
  }

  return null;
}