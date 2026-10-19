
import React from 'react';
import { Globe } from 'lucide-react';
import {
  getPackageEligibility, COUNTRY_FLAGS, PASSPORT_NAMES, eligibilityLabel,
} from '../utils/packageNationality';

export const NationalityBadge = ({ pkg, className = '' }) => {
  if (!pkg) return null;
  const elig = getPackageEligibility(pkg);
  return (
    <p
      className={`flex items-center gap-1 text-[10px] sm:text-[11px] text-gray-500 ${className}`}
      title={eligibilityLabel(pkg)}
    >
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {elig.allowed.map((c) => <span key={c}>{COUNTRY_FLAGS[c]}</span>)}
      </span>
      <span className="truncate">
        {elig.kenyaOnly ? 'Kenyan passport only' : `Kenya${elig.TZ ? ' · Tanzania' : ''}${elig.SO ? ' · Somalia' : ''}`}
      </span>
    </p>
  );
};

export const NationalityNotice = ({ pkg, className = '' }) => {
  if (!pkg) return null;
  const elig = getPackageEligibility(pkg);
  const cp = pkg.countryPricing ?? pkg.country_pricing ?? {};
  return (
    <div className={`rounded-xl border border-amber-200 bg-amber-50/70 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <Globe className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-900">
            {elig.kenyaOnly ? 'Kenyan passport holders only' : 'Passport eligibility'}
          </p>
          <p className="text-xs text-amber-800 mt-0.5">
            {elig.kenyaOnly
              ? 'This package can only be booked with a Kenyan passport. Tanzanian and Somali passport holders cannot book it.'
              : 'Your passport is checked during booking. Only the nationalities below can book this package.'}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {['KE', 'TZ', 'SO'].map((c) => {
              const ok = elig[c];
              return (
                <span
                  key={c}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                    ok ? 'bg-white border-emerald-200 text-emerald-700'
                       : 'bg-gray-100 border-gray-200 text-gray-400 line-through'
                  }`}
                >
                  {COUNTRY_FLAGS[c]} {PASSPORT_NAMES[c]}
                  {ok && c !== 'KE' && cp?.[c]?.adult ? ` · $${Number(cp[c].adult).toLocaleString('en-US')}` : ''}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NationalityBadge;