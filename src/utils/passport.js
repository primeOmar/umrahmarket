/**
 * Passport helpers (client side).
 *
 * The 6-month validity rule is enforced authoritatively on the backend, but we
 * mirror it here for instant feedback so the user isn't sent to the server only
 * to be rejected. Keep the two in sync (backend: MIN_VALIDITY_MONTHS = 6).
 */
export const MIN_VALIDITY_MONTHS = 6;

const toDateOnly = (v) => {
  if (!v) return null;
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? null
    : new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const addMonths = (date, months) => {
  const d = new Date(date.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
};

const todayUTC = () => {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
};

export const fmtDate = (d) =>
  d ? d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

/**
 * Resolve the travel date for a package — the package's departure date
 * (available_from), falling back to today so the rule still has a safe floor.
 */
export const getTravelDate = (pkg) => toDateOnly(pkg?.available_from) || todayUTC();

/**
 * Validate a passport expiry against the 6-month rule for a package.
 * Returns { valid, reason, travelDate, minExpiry, expiry }.
 *   reason ∈ 'invalid_expiry' | 'already_expired' | 'insufficient_validity' | null
 */
export const checkExpiryAgainstPackage = (pkg, expiryInput) => {
  const travelDate = getTravelDate(pkg);
  const minExpiry = addMonths(travelDate, MIN_VALIDITY_MONTHS);
  const expiry = toDateOnly(expiryInput);

  if (!expiry) return { valid: false, reason: 'invalid_expiry', travelDate, minExpiry, expiry: null };
  if (expiry < todayUTC()) return { valid: false, reason: 'already_expired', travelDate, minExpiry, expiry };
  if (expiry < minExpiry) return { valid: false, reason: 'insufficient_validity', travelDate, minExpiry, expiry };
  return { valid: true, reason: null, travelDate, minExpiry, expiry };
};

export const expiryReasonMessage = (reason) => {
  switch (reason) {
    case 'invalid_expiry':
      return 'Please enter a valid passport expiry date.';
    case 'already_expired':
      return 'This passport has already expired. Please renew it before booking.';
    case 'insufficient_validity':
      return `Your passport must be valid for at least ${MIN_VALIDITY_MONTHS} months beyond your travel date. Please renew it and book again.`;
    default:
      return 'Passport does not meet the validity requirement.';
  }
};

// Labels for the per-field match result returned by the backend.
export const MATCH_FIELD_LABELS = {
  passportNumber: 'Passport number',
  expiry: 'Expiry date',
  surname: 'Surname',
  givenNames: 'Given names',
  nationality: 'Nationality',
};
