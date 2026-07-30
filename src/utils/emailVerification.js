export const isEmailVerified = (user) => {
  if (!user || typeof user !== 'object') return false;

  if (user.emailVerified === true) return true;
  if (user.email_verified === true) return true;

  // Supports both camelCase and snake_case timestamps returned by auth providers.
  const confirmedAt = user.emailConfirmedAt || user.email_confirmed_at || user.emailVerifiedAt || user.email_verified_at;
  if (typeof confirmedAt === 'string') return confirmedAt.trim().length > 0;
  if (confirmedAt instanceof Date) return !Number.isNaN(confirmedAt.getTime());

  return false;
};
