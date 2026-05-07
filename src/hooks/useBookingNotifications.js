import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../config/supabaseClient';

export const useBookingNotifications = (agentPackages = []) => {
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [bookingVersion, setBookingVersion] = useState(0);
  const channelRef = useRef(null);
  const packageMapRef = useRef({});

  // Keep package map in sync with latest packages prop
  useEffect(() => {
    const map = {};
    agentPackages.forEach(pkg => {
      if (pkg.id) map[pkg.id] = pkg.name || pkg.title || 'Package';
    });
    packageMapRef.current = map;
  }, [agentPackages]);

  const dismissToast = useCallback((toastId) => {
    setToasts(prev => prev.filter(t => t.toastId !== toastId));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((notifId) => {
    setNotifications(prev =>
      prev.map(n => n.id === notifId ? { ...n, read: true } : n)
    );
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  // ─── FIX 1: Derive a stable key from the package IDs so we only
  // re-subscribe when the actual set of packages changes, not on every render.
  const packageIdsKey = agentPackages
    .map(p => p.id)
    .filter(Boolean)
    .sort()
    .join(',');

  useEffect(() => {
    if (!supabase) return;

    // ─── FIX 2: Original code had `[]` as the dependency array, so the channel
    // was created once on mount — before agentPackages had loaded from the API.
    // packageMapRef.current was empty, so every incoming booking was dropped by
    // the `if (!packageName) return` guard. Now we wait until packages are
    // available before subscribing at all.
    if (!packageIdsKey) return;

    const packageIds = packageIdsKey.split(',');

    // Tear down any existing channel before creating a new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // ─── FIX 3: Add a server-side `filter` so Supabase Realtime only delivers
    // rows whose package_id belongs to this agent. Without this filter,
    // Supabase may not send any events at all depending on your Realtime
    // publication and RLS configuration.
    //
    // Supabase filter syntax:
    //   single package  → "package_id=eq.<uuid>"
    //   multiple        → "package_id=in.(<uuid1>,<uuid2>,...)"
    // Docs: https://supabase.com/docs/guides/realtime/postgres-changes#filter-by-column-value
    const filterExpr =
      packageIds.length === 1
        ? `package_id=eq.${packageIds[0]}`
        : `package_id=in.(${packageIds.join(',')})`;

    const channelName = `booking-notifications:${packageIdsKey}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: filterExpr,
        },
        (payload) => {
          const booking = payload.new;
          if (!booking) return;

          // Belt-and-suspenders client-side check — packageMap should always
          // have this package now, but fall back gracefully if not.
          const packageName = packageMapRef.current[booking.package_id];
          const label = packageName || 'your package';

          if (!packageName) {
            console.warn(
              '[useBookingNotifications] No package name for package_id:',
              booking.package_id,
              '— map keys:',
              Object.keys(packageMapRef.current)
            );
          }

          const notif = {
            id: booking.id,
            type: 'new_booking',
            title: 'New Booking',
            message: `A client booked ${label}`,
            packageName: label,
            bookingId: booking.id,
            amount: booking.amount_paid,
            currency: booking.currency || 'KES',
            createdAt: booking.created_at || new Date().toISOString(),
            read: false,
          };

          // ─── FIX 4: Deduplicate — prevent the same booking from appearing
          // twice if the hook re-runs or the event fires more than once.
          setNotifications(prev => {
            if (prev.some(n => n.id === notif.id)) return prev;
            return [notif, ...prev];
          });
          setBookingVersion(v => v + 1);

          const toastId = `toast-${Date.now()}-${Math.random()}`;
          setToasts(prev => [...prev, { ...notif, toastId }]);

          setTimeout(() => {
            setToasts(prev => prev.filter(t => t.toastId !== toastId));
          }, 5000);
        }
      )
      .subscribe((status, err) => {
        // Log subscription state to help debug connectivity issues
        if (status === 'SUBSCRIBED') {
          console.log('[useBookingNotifications] ✅ Subscribed:', channelName);
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[useBookingNotifications] ❌ Channel error:', status, err);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [packageIdsKey]); // ← re-subscribe whenever the watched package set changes

  return {
    notifications,
    unreadCount,
    toasts,
    bookingVersion,
    markAllRead,
    markRead,
    dismissToast,
  };
};