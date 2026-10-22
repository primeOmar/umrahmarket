import React, { useEffect, useMemo, useState } from 'react';
import {
  getPackageEligibility, tiersForCountry, countryFlag, countryName, passportName,
} from '../utils/packageNationality';

const COLORS = {
  KE: { solid: '#059669', soft: '#34d399', glow: 'rgba(52,211,153,0.35)' },
  TZ: { solid: '#2563eb', soft: '#60a5fa', glow: 'rgba(96,165,250,0.35)' },
  SO: { solid: '#d97706', soft: '#fbbf24', glow: 'rgba(251,191,36,0.35)' },
};
const FALLBACK = [
  { solid: '#7c3aed', soft: '#a78bfa', glow: 'rgba(167,139,250,0.35)' },
  { solid: '#db2777', soft: '#f472b6', glow: 'rgba(244,114,182,0.35)' },
  { solid: '#0891b2', soft: '#22d3ee', glow: 'rgba(34,211,238,0.35)' },
];

export const countryColor = (code) =>
  COLORS[code] || FALLBACK[((code || 'XX').charCodeAt(0) + (code || 'XX').charCodeAt(1)) % FALLBACK.length];

/** Countries a package is priced for + the one currently in view; auto-cycles until `pause` is true. */
export function usePriceCountryCycle(pkg, { pause = false, intervalMs = 3500 } = {}) {
  const countries = useMemo(() => getPackageEligibility(pkg).allowed, [pkg]);
  const [index, setIndex] = useState(0);
  const multi = countries.length > 1;

  useEffect(() => {
    if (!multi || pause) return undefined;
    const t = setInterval(() => setIndex((i) => i + 1), intervalMs);
    return () => clearInterval(t);
  }, [multi, pause, intervalMs]);

  const safe = ((index % countries.length) + countries.length) % countries.length;
  return {
    countries,
    multi,
    code: countries[safe],
    select: (c) => { const i = countries.indexOf(c); if (i >= 0) setIndex(i); },
  };
}

/**
 * Card price that flips through each country's price with a colour change.
 * children({ usd, code, color }) renders the amount; the country chip and
 * animation are handled here.
 */
export default function FlippingPrice({
  pkg, children, chipClassName = '', className = '', onDark = true,
}) {
  const { code, multi } = usePriceCountryCycle(pkg);
  const usd = tiersForCountry(pkg, code).adult;
  const color = countryColor(code);

  return (
    <div className={className}>
      <div key={code} className={multi ? 'price-flip-in' : ''} style={multi ? { '--flip-glow': color.glow } : undefined}>
        {children({ usd: code === 'KE' ? Number(pkg.price ?? usd) : usd, code, color, multi })}
      </div>
      {multi && (
        <span
          key={`chip-${code}`}
          className={`price-flip-in inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${chipClassName}`}
          style={{ background: onDark ? color.solid : `${color.solid}1a`, color: onDark ? '#fff' : color.solid }}
          aria-label={`Price for ${passportName(code)} passport`}
        >
          <span aria-hidden="true">{countryFlag(code)}</span>{countryName(code)} passport
        </span>
      )}
    </div>
  );
}
