import { useEffect } from 'react';

const GoogleCallback = () => {
  useEffect(() => {
    const hash   = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const idToken = params.get('id_token');
    const error   = params.get('error');

    if (idToken) {
      localStorage.setItem('google_auth_result', JSON.stringify({
        type: 'GOOGLE_OAUTH_SUCCESS',
        idToken,
        ts: Date.now(),
      }));
    } else {
      localStorage.setItem('google_auth_result', JSON.stringify({
        type: 'GOOGLE_OAUTH_ERROR',
        error: error || 'No token received',
        ts: Date.now(),
      }));
    }

    // Navigate away — do NOT call window.close() (COOP blocks it)
    window.location.replace('/auth/google/done');
  }, []);

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', height: '100vh',
      fontFamily: 'sans-serif', color: '#666',
    }}>
      <p>Completing sign-in...</p>
    </div>
  );
};

export default GoogleCallback;