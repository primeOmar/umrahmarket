import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabaseClient';

export const useAgentClients = (agentUserId) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClients = useCallback(async () => {
    if (!agentUserId) return;
    setLoading(true);
    setError(null);

    try {
      // Get agent's package IDs
      const { data: agentPackages, error: pkgErr } = await supabase
        .from('packages')
        .select('id')
        .eq('created_by', agentUserId);

      if (pkgErr) throw pkgErr;
      if (!agentPackages?.length) { setClients([]); return; }

      const packageIds = agentPackages.map(p => p.id);

      // Get bookings for those packages with package details
      const { data: bookings, error: bookErr } = await supabase
        .from('bookings')
        .select(`
          id, status, amount_paid, currency, notes, created_at, user_id,
          packages(id, name, type, duration, available_from, available_to)
        `)
        .in('package_id', packageIds)
        .order('created_at', { ascending: false });

      if (bookErr) throw bookErr;
      if (!bookings?.length) { setClients([]); return; }

      // Get profiles for all unique client user_ids
      const userIds = [...new Set(bookings.map(b => b.user_id).filter(Boolean))];
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone')
        .in('id', userIds);

      if (profErr) throw profErr;

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

      const merged = bookings.map(b => {
        const profile = profileMap[b.user_id] || {};
        return {
          bookingId: b.id,
          userId: b.user_id,
          name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Unknown',
          email: profile.email || '—',
          phone: profile.phone || '—',
          package: b.packages,
          packageName: b.packages?.name || '—',
          packageType: b.packages?.type || 'umrah',
          duration: b.packages?.duration,
          availableFrom: b.packages?.available_from,
          availableTo: b.packages?.available_to,
          status: b.status,
          amountPaid: b.amount_paid,
          currency: b.currency || 'KES',
          notes: b.notes,
          bookedAt: b.created_at,
        };
      });

      setClients(merged);
    } catch (err) {
      console.error('useAgentClients error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [agentUserId]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  return { clients, loading, error, refetch: fetchClients };
};
