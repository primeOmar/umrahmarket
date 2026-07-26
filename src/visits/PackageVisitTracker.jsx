import { useEffect, useRef } from 'react';
import { userStore } from '../api'; // adjust path — same import PackageDetailPage.jsx already uses

// Same device/browser/timezone capture as your existing Visits.jsx
const getBrowserInfo = () => {
  const userAgent = navigator.userAgent;
  const browserInfo = { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };

  if (userAgent.includes('Firefox/')) {
    browserInfo.browser = 'Firefox';
  } else if (userAgent.includes('Chrome/')) {
    browserInfo.browser = 'Chrome';
  } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) {
    browserInfo.browser = 'Safari';
  } else if (userAgent.includes('Edge/')) {
    browserInfo.browser = 'Edge';
  }

  if (userAgent.includes('Windows')) {
    browserInfo.os = 'Windows';
  } else if (userAgent.includes('Mac OS')) {
    browserInfo.os = 'MacOS';
  } else if (userAgent.includes('Linux')) {
    browserInfo.os = 'Linux';
  } else if (userAgent.includes('Android')) {
    browserInfo.os = 'Android';
  } else if (userAgent.includes('iOS')) {
    browserInfo.os = 'iOS';
  }

  if (/Mobi|Android/i.test(userAgent)) {
    browserInfo.device = 'Mobile';
  } else if (/Tablet|iPad/i.test(userAgent)) {
    browserInfo.device = 'Tablet';
  } else {
    browserInfo.device = 'Desktop';
  }

  return browserInfo;
};

const getLocationFromTimezone = () => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [area, loc] = timeZone.split('/');
  const continent = area?.replace(/_/g, ' ') || 'Unknown';
  const city = loc?.replace(/_/g, ' ') || 'Unknown';
  const offset = new Date().getTimezoneOffset();
  const utcOffset = -offset / 60;

  return {
    continent,
    city,
    timeZone,
    utcOffset: `UTC${utcOffset >= 0 ? '+' : ''}${utcOffset}`,
  };
};

/**
 * Logs a "package view" — package + agent snapshot (name, price, dates) —
 * the same way Visits.jsx logs a page view. Render this once packageData
 * is confirmed loaded; it renders nothing.
 *
 * <PackageVisitTracker packageData={packageData} />
 */
const PackageVisitTracker = ({ packageData }) => {
  const loggedIdRef = useRef(null); // guards against double-logging the same package on re-render

  useEffect(() => {
    if (!packageData?.id) return;
    if (loggedIdRef.current === packageData.id) return;
    loggedIdRef.current = packageData.id;

    const logVisit = async () => {
      try {
        const currentUser = userStore.get();
        const visitorInfo = {
          ...getBrowserInfo(),
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          language: navigator.language,
          username: currentUser?.username || 'Anonymous',
          location: getLocationFromTimezone(),
        };

        const packageInfo = {
          packageId: packageData.id,
          packageName: packageData.title,
          agentId: packageData.agent_id ?? null,
          agentName: packageData.agent_name ?? null,
          price: packageData.price ?? null,
          duration: packageData.duration ?? null,
          availableFrom: packageData.available_from ?? null,
          availableTo: packageData.available_to ?? null,
        };

        await fetch(`${import.meta.env.VITE_API_BASE}/api/visits/packagevisits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitorInfo, packageInfo }),
          credentials: 'include',
        });
      } catch (error) {
        console.error('Error logging package visit:', error);
      }
    };

    logVisit();
  }, [packageData?.id]);

  return null;
};

export default PackageVisitTracker;