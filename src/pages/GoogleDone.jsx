// src/pages/GoogleDone.jsx
//
// This page exists solely so the popup can navigate away from the
// /auth/google/callback URL (avoiding COOP window.close() issues while
// still on Google's origin), then close itself.
//
// The main tab's AuthModal is already polling localStorage for
// 'google_auth_result' every 300ms and will complete sign-in there —
// this popup's only job is to get out of the way.

import { useEffect, useState } from 'react';

const GoogleDone = () => {
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      window.close();
      // If we're still here, the browser blocked the scripted close
      // (mostly Firefox) — show the fallback button below.
      setClosed(true);
    }, 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', gap: 16,
      fontFamily: 'sans-serif', color: '#666',
    }}>
      {closed ? (
        <>
          <p>Signed in — you can close this tab.</p>
          <button
            onClick={() => window.close()}
            style={{
              padding: '10px 20px',
              background: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Close this tab
          </button>
        </>
      ) : (
        <p>Completing sign-in...</p>
      )}
    </div>
  );
};

export default GoogleDone;