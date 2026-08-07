const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
const SAME_ORIGIN_PROXY_PREFIX = '/backend-proxy';

const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');

export const isLocalBrowser = () =>
  typeof window !== 'undefined' && LOCAL_HOSTNAMES.has(window.location.hostname);

const isHostedFrontend = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host.endsWith('.vercel.app') || host === 'www.umrahmarket.net' || host === 'umrahmarket.net';
};

export const resolveApiOrigin = (fallback = '') => {
  const envBase = trimTrailingSlash(
    import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || fallback
  );

  if (isLocalBrowser()) {
    return '';
  }

  // In hosted browser environments, send API calls through the same-origin
  // Vercel rewrite to prevent CORS preflight/ACAO failures.
  if (isHostedFrontend()) {
    return SAME_ORIGIN_PROXY_PREFIX;
  }

  return envBase;
};
