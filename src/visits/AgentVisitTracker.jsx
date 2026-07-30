import { useEffect, useRef } from 'react';
import { userStore } from '../api'; // adjust path to match this file's actual location

// Same device/browser/timezone capture as Visits.jsx / PackageVisitTracker.jsx
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
 * Logs an "agent profile view" the same way PackageVisitTracker logs a
 * package view. Render once `agent` is confirmed loaded; renders nothing.
 *
 * <AgentVisitTracker agent={agent} />
 */
const AgentVisitTracker = ({ agent }) => {
  const loggedIdRef = useRef(null); // guards against double-logging the same agent on re-render

  useEffect(() => {
    if (!agent?.id) return;
    if (loggedIdRef.current === agent.id) return;
    loggedIdRef.current = agent.id;

    const agentName = agent.businessName || `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || 'Unnamed Agent';

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

        const agentInfo = {
          agentId: agent.id,
          agentName,
          verificationStatus: agent.verificationStatus ?? null,
          yearsExperience: typeof agent.yearsExperience === 'number' ? agent.yearsExperience : null,
        };

        await fetch(`${import.meta.env.VITE_API_BASE}/api/visits/agentvisits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitorInfo, agentInfo }),
          credentials: 'include',
        });
      } catch {
        return;
      }
    };

    logVisit();
  }, [agent?.id]);

  return null;
};

export default AgentVisitTracker;