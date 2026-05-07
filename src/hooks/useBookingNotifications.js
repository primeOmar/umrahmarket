import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../config/supabaseClient';

export const useBookingNotifications = (agentPackages = []) => {
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [bookingVersion, setBookingVersion] = useState(0);
  const channelRef = useRef(null);
  const packageMapRef = useRef({});

  // Keep package map in sync with latest packages prop (accessed via ref in realtime callback)
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

  useEffect(() => {
    if (!supabase) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`booking-notifications:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookings' },
        ({ new: booking }) => {
          const packageName = packageMapRef.current[booking.package_id];
          if (!packageName) return; // not one of this agent's packages

          const notif = {
            id: booking.id,
            type: 'new_booking',
            title: 'New Booking',
            message: `A client booked ${packageName}`,
            packageName,
            bookingId: booking.id,
            amount: booking.amount_paid,
            currency: booking.currency || 'KES',
            createdAt: booking.created_at || new Date().toISOString(),
            read: false,
          };

          setNotifications(prev => [notif, ...prev]);
          setBookingVersion(v => v + 1);

          const toastId = `toast-${Date.now()}-${Math.random()}`;
          const toast = { ...notif, toastId };
          setToasts(prev => [...prev, toast]);

          // Auto-dismiss toast after 5 seconds
          setTimeout(() => {
            setToasts(prev => prev.filter(t => t.toastId !== toastId));
          }, 5000);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []); // subscription lives for the lifetime of the component

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
