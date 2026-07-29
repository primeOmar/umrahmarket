const STORAGE_KEY = 'umrah_pending_booking_flow';

export const readPendingBookingFlow = (userId) => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || (userId && parsed.userId && parsed.userId !== userId)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const persistBookingFlow = (userId, payload) => {
  if (typeof window === 'undefined' || !userId) return null;
  try {
    const current = readPendingBookingFlow(userId) || {};
    const next = {
      ...current,
      ...payload,
      userId,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
};

export const clearPendingBookingFlow = (userId) => {
  if (typeof window === 'undefined') return;
  try {
    if (!userId) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const current = readPendingBookingFlow(userId);
    if (!current) return;
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
};
