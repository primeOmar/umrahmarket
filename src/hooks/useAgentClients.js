import { useState, useEffect, useCallback } from 'react';
import { request } from '../api';

export const useAgentClients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await request({ method: 'get', url: '/bookings/agent-clients' });
      setClients(res.data?.clients || []);
    } catch (err) {
      console.error('useAgentClients error:', err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  return { clients, loading, error, refetch: fetchClients };
};
