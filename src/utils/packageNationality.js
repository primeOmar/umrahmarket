// Passports from a country the package isn't priced for can't book it.
// Unrecognised nationalities ('OTHER') are blocked too.
export const BLOCK_UNLISTED_NATIONALITIES = true;

const DEFAULT_COUNTRY = 'KE';

const NAME_OVERRIDES = { KE: 'Kenya', TZ: 'Tanzania', SO: 'Somalia' };
const DEMONYM_OVERRIDES = {
  KE: 'Kenyan', TZ: 'Tanzanian', SO: 'Somali', UG: 'Ugandan', RW: 'Rwandan', BI: 'Burundian',
  ET: 'Ethiopian', GB: 'British', US: 'American', IN: 'Indian', PK: 'Pakistani',
};

// MRZ / ISO alpha-3 → alpha-2 for passports pilgrims commonly hold.
const ALPHA3 = {
  KEN: 'KE', TZA: 'TZ', SOM: 'SO', UGA: 'UG', RWA: 'RW', BDI: 'BI', ETH: 'ET', SSD: 'SS',
  COD: 'CD', ZMB: 'ZM', MWI: 'MW', MOZ: 'MZ', ZWE: 'ZW', ZAF: 'ZA', DJI: 'DJ', ERI: 'ER',
  SDN: 'SD', EGY: 'EG', NGA: 'NG', GHA: 'GH', GBR: 'GB', USA: 'US', CAN: 'CA', IND: 'IN',
  PAK: 'PK', BGD: 'BD', IDN: 'ID', MYS: 'MY', SAU: 'SA', ARE: 'AE', OMN: 'OM', YEM: 'YE',
};

const EXTRA_ALIASES = {
  'KENYAN': 'KE', 'REPUBLIC OF KENYA': 'KE',
  'TANZANIAN': 'TZ', 'UNITED REPUBLIC OF TANZANIA': 'TZ', 'TANZANIA, UNITED REPUBLIC OF': 'TZ',
  'SOMALI': 'SO', 'SOMALIAN': 'SO', 'FEDERAL REPUBLIC OF SOMALIA': 'SO',
  'UGANDAN': 'UG', 'RWANDAN': 'RW', 'BURUNDIAN': 'BI', 'ETHIOPIAN': 'ET', 'BRITISH': 'GB',
  'AMERICAN': 'US', 'INDIAN': 'IN', 'PAKISTANI': 'PK',
};

const regionNames = (() => {
  try { return new Intl.DisplayNames(['en'], { type: 'region' }); } catch { return null; }
})();

let nameIndex = null;
const getNameIndex = () => {
  if (nameIndex) return nameIndex;
  nameIndex = new Map();
  if (!regionNames) return nameIndex;
  for (let a = 65; a <= 90; a += 1) {
    for (let b = 65; b <= 90; b += 1) {
      const code = String.fromCharCode(a, b);
      let name;
      try { name = regionNames.of(code); } catch { name = null; }
      if (name && name !== code) nameIndex.set(name.toUpperCase(), code);
    }
  }
  return nameIndex;
};

export const countryName = (code) => {
  if (!code || code === 'OTHER') return 'Other';
  if (NAME_OVERRIDES[code]) return NAME_OVERRIDES[code];
  try { return regionNames?.of(code) || code; } catch { return code; }
};

export const passportName = (code) => DEMONYM_OVERRIDES[code] || countryName(code);

export const countryFlag = (code) => {
  if (!/^[A-Z]{2}$/.test(code || '')) return '🌍';
  return String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0)));
};

/** Passport nationality text or MRZ code → ISO alpha-2 | 'OTHER' (unrecognised) | null (empty). */
export function normaliseNationality(raw) {
  const v = String(raw ?? '').trim().toUpperCase().replace(/[<]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!v) return null;
  if (ALPHA3[v]) return ALPHA3[v];
  if (EXTRA_ALIASES[v]) return EXTRA_ALIASES[v];
  if (/^[A-Z]{2}$/.test(v) && regionNames) {
    try {
      const n = regionNames.of(v);
      if (n && n !== v) return v;
    } catch { /* not a region */ }
  }
  return getNameIndex().get(v) || 'OTHER';
}

/** Pulls a nationality out of whatever shape a passport-verification response uses. */
export function extractNationality(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const candidates = [
    obj.nationality, obj.passport_country, obj.passportCountry, obj.country,
    obj.passport?.nationality, obj.passport?.passport_country,
    obj.data?.nationality, obj.data?.passport_country,
    obj.record?.nationality, obj.record?.passport_country,
    obj.verification?.nationality, obj.verification?.passport_country,
    obj.ocr?.nationality, obj.mrz?.nationality,
  ];
  for (const c of candidates) {
    const code = normaliseNationality(c);
    if (code) return code;
  }
  return null;
}

const countryTiers = (pkg) => pkg?.countryPricing ?? pkg?.country_pricing ?? {};

/** What a package is open to. Works on normalised OR raw package objects. */
export function getPackageEligibility(pkg) {
  const cp = countryTiers(pkg);
  const extra = Object.keys(cp)
    .map((k) => k.toUpperCase())
    .filter((k) => k !== DEFAULT_COUNTRY && Number(cp[k]?.adult ?? cp[k.toLowerCase()]?.adult) > 0);
  return {
    KE: true,
    TZ: extra.includes('TZ'),
    SO: extra.includes('SO'),
    allowed: [DEFAULT_COUNTRY, ...extra],
    kenyaOnly: extra.length === 0,
    open: extra.length > 0,
  };
}

export function canBookWithNationality(pkg, code) {
  if (!code) return true; // not read yet — the server decides authoritatively
  if (code === 'OTHER') return !BLOCK_UNLISTED_NATIONALITIES;
  return getPackageEligibility(pkg).allowed.includes(code);
}

/** Price tiers a passport country pays on this package (default tiers for Kenya). */
export function tiersForCountry(pkg, code) {
  const base = pkg?.priceTiers || {};
  const over = code && code !== DEFAULT_COUNTRY ? countryTiers(pkg)[code] : null;
  const out = {};
  ['adult', 'child', 'minor_child', 'infant'].forEach((k) => {
    const v = Number(over?.[k]);
    out[k] = v > 0 ? v : Number(base[k] ?? pkg?.price ?? 0);
  });
  return out;
}

const joinList = (arr) =>
  arr.length <= 1 ? (arr[0] || '') : `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`;

/** Disclaimer shown when a pilgrim's passport can't book this package. */
export function nationalityBlockMessage(pkg, code) {
  const elig = getPackageEligibility(pkg);
  const yours = code && code !== 'OTHER' ? `a passport from ${countryName(code)}` : 'a passport from another country';
  const who = elig.kenyaOnly ? 'Kenyan' : joinList(elig.allowed.map(passportName));
  return `This package is only available to ${who} passport holders. The passport you uploaded is ${yours}.`;
}

/** Short label for cards / detail header. */
export function eligibilityLabel(pkg) {
  const elig = getPackageEligibility(pkg);
  if (elig.kenyaOnly) return 'Kenyan passport only';
  return `Open to ${joinList(elig.allowed.map(countryName))}`;
}
