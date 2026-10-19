
export const BLOCK_UNLISTED_NATIONALITIES = false;

export const RESTRICTED_COUNTRIES = ['TZ', 'SO'];

export const COUNTRY_NAMES  = { KE: 'Kenya', TZ: 'Tanzania', SO: 'Somalia' };
export const PASSPORT_NAMES = { KE: 'Kenyan', TZ: 'Tanzanian', SO: 'Somali' };
export const COUNTRY_FLAGS  = { KE: '🇰🇪', TZ: '🇹🇿', SO: '🇸🇴' };

const ALIASES = {
  KE: ['KE', 'KEN', 'KENYA', 'KENYAN', 'REPUBLIC OF KENYA'],
  TZ: ['TZ', 'TZA', 'TANZANIA', 'TANZANIAN', 'UNITED REPUBLIC OF TANZANIA', 'TANZANIA, UNITED REPUBLIC OF'],
  SO: ['SO', 'SOM', 'SOMALIA', 'SOMALI', 'SOMALIAN', 'FEDERAL REPUBLIC OF SOMALIA'],
};

/** Passport nationality / country text or MRZ code → 'KE' | 'TZ' | 'SO' | 'OTHER' | null (unknown). */
export function normaliseNationality(raw) {
  const v = String(raw ?? '').trim().toUpperCase().replace(/[<]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!v) return null;
  for (const [code, list] of Object.entries(ALIASES)) {
    if (list.includes(v)) return code;
  }
  return 'OTHER';
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

const hasTier = (pkg, code) => {
  const cp = pkg?.countryPricing ?? pkg?.country_pricing ?? {};
  return Number(cp?.[code]?.adult) > 0;
};

/** What a package is open to. Works on normalised OR raw package objects. */
export function getPackageEligibility(pkg) {
  const tz = hasTier(pkg, 'TZ');
  const so = hasTier(pkg, 'SO');
  const allowed = ['KE', ...(tz ? ['TZ'] : []), ...(so ? ['SO'] : [])];
  return {
    KE: true, TZ: tz, SO: so,
    allowed,
    kenyaOnly: !tz && !so,
    open: tz || so,
  };
}

export function canBookWithNationality(pkg, code) {
  if (!code || code === 'KE') return true;
  if (code === 'OTHER') return !BLOCK_UNLISTED_NATIONALITIES;
  return !!getPackageEligibility(pkg)[code];
}

const joinList = (arr) =>
  arr.length <= 1 ? (arr[0] || '') : `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`;

/** Disclaimer shown when a pilgrim's passport can't book this package. */
export function nationalityBlockMessage(pkg, code) {
  const elig = getPackageEligibility(pkg);
  const yours = PASSPORT_NAMES[code] || 'your';
  if (elig.kenyaOnly) {
    return `This package can only be booked with a Kenyan passport. The passport you provided is ${code && PASSPORT_NAMES[code] ? `${yours}` : 'not Kenyan'}.`;
  }
  const names = joinList(elig.allowed.map((c) => PASSPORT_NAMES[c]));
  return `This package can only be booked with a ${names} passport. The passport you provided is ${code && PASSPORT_NAMES[code] ? yours : 'from another country'}.`;
}

/** Short label for cards / detail header. */
export function eligibilityLabel(pkg) {
  const elig = getPackageEligibility(pkg);
  if (elig.kenyaOnly) return 'Kenyan passport only';
  return `Open to ${joinList(elig.allowed.map((c) => COUNTRY_NAMES[c]))}`;
}