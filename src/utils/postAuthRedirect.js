// Remembers where a pilgrim was headed when we asked them to sign in or
// create an account (e.g. the Lipa Mdogo Mdogo button), so every auth path —
// password login, registration, Google, or signing in later after confirming
// their email — lands them back there instead of on the generic dashboard.
const KEY = 'um_post_auth_redirect';
const TTL_MS = 2 * 60 * 60 * 1000; // stale intents (2h+) are ignored

const storage = () => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
};

export function setPostAuthRedirect(path) {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return;
  try {
    storage()?.setItem(KEY, JSON.stringify({ path, ts: Date.now() }));
  } catch { /* storage unavailable — the redirect just won't happen */ }
}

export function peekPostAuthRedirect() {
  try {
    const raw = storage()?.getItem(KEY);
    if (!raw) return null;
    const { path, ts } = JSON.parse(raw);
    if (!path || Date.now() - Number(ts) > TTL_MS) {
      storage()?.removeItem(KEY);
      return null;
    }
    return path;
  } catch {
    return null;
  }
}

/**
 * Returns the saved path (once) for a pilgrim account, then forgets it.
 * Non-client accounts (agents) never get redirected into pilgrim pages.
 */
export function consumePostAuthRedirect(user) {
  const path = peekPostAuthRedirect();
  try {
    storage()?.removeItem(KEY);
  } catch { /* ignore */ }
  if (!path) return null;
  if (user && user.role && user.role !== 'client') return null;
  return path;
}
