// src/components/PopularSearchLinks.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Fixes the "orphan landing page" SEO gap: the 7 pages defined in
// src/seo/landingPagesConfig.js are in sitemap.xml but were, until now, not
// linked from anywhere on the actual site — no internal links means weak
// crawl priority and little-to-no ranking signal, even once discovered.
//
// This component is driven entirely by LANDING_PAGES, the same config file
// that already drives +data.js / +Head.jsx / sitemap.xml. Add a new landing

import { Link } from 'react-router-dom';
import { LANDING_PAGES } from '../seo/landingPagesConfig.js';

const PopularSearchLinks = ({ className = '' }) => {
  if (!LANDING_PAGES?.length) return null;

  return (
    <nav
      aria-label="Popular Umrah and Hajj package searches"
      className={`border-t border-gray-100 pt-6 mt-6 ${className}`}
    >
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
        Popular Searches
      </h2>
      <ul className="flex flex-wrap gap-x-5 gap-y-2">
        {LANDING_PAGES.map((page) => (
          <li key={page.path}>
            <Link
              to={page.path}
              className="text-sm text-gray-600 hover:text-emerald-600 transition-colors duration-200"
            >
              {page.breadcrumbName}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default PopularSearchLinks;