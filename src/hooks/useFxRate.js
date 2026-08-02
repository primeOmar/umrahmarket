// src/hooks/useFxRate.js
import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || '';

let _cache = null; // module-level cache so multiple components share one fetch

export function useFxRate() {
  const [fxRate,    setFxRate]    = useState(_cache?.rate    ?? null);
  const [fxSource,  setFxSource]  = useState(_cache?.source  ?? null);
  const [fxLoading, setFxLoading] = useState(!_cache);
  const [fxError,   setFxError]   = useState(null);

  useEffect(() => {
    if (_cache) return; // already fetched this session
    let alive = true;
    fetch(`${API}/api/fx/rate`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        if (!alive) return;
        if (!json.success) throw new Error(json.message);
        _cache = { rate: json.usdKes, source: json.source };
        setFxRate(json.usdKes);
        setFxSource(json.source);
        setFxLoading(false);
      })
      .catch(err => {
        if (!alive) return;
        // Fallback so UI doesn't break if rate endpoint is down
        const fallback = 130;
        _cache = { rate: fallback, source: 'fallback' };
        setFxRate(fallback);
        setFxError(err.message);
      })
      .finally(() => { if (alive) setFxLoading(false); });
    return () => { alive = false; };
  }, []);

  const usdToKes = (usd) => fxRate ? Math.round(usd * fxRate) : null;
  const kesToUsd = (kes) => fxRate ? parseFloat((kes / fxRate).toFixed(2)) : null;

  const fmtKes = (kes) =>
    kes != null
      ? `KES ${Math.round(kes).toLocaleString('en-KE')}`
      : '…';

  const fmtUsd = (usd) =>
    usd != null
      ? `$${Number(usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '…';

  return { fxRate, fxSource, fxLoading, fxError, usdToKes, kesToUsd, fmtKes, fmtUsd };
}