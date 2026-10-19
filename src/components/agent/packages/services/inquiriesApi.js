import { request } from '../../../../api';

export const getInquiryAgents = async () => (await request({ method: 'get', url: '/inquiries/agents' })).data;
export const createCustomRequest = async (payload) =>
  (await request({ method: 'post', url: '/inquiries', data: payload })).data;
export const getMyCustomRequests = async () => (await request({ method: 'get', url: '/inquiries/mine' })).data;
export const closeCustomRequest = async (id) =>
  (await request({ method: 'post', url: `/inquiries/${id}/close` })).data;

export const getIncomingRequests = async () => (await request({ method: 'get', url: '/inquiries/agent/incoming' })).data;
export const getIncomingUnreadCount = async () =>
  (await request({ method: 'get', url: '/inquiries/agent/unread-count' })).data;
export const markRequestViewed = async (recipientId) =>
  (await request({ method: 'post', url: `/inquiries/agent/${recipientId}/view` })).data;
export const respondToRequest = async (recipientId, body) =>
  (await request({ method: 'post', url: `/inquiries/agent/${recipientId}/respond`, data: body })).data;
export const decideOffer = async (requestId, recipientId, decision) =>
  (await request({ method: 'post', url: `/inquiries/${requestId}/offers/${recipientId}/decision`, data: { decision } })).data;

// ── Guest (unauthenticated) ──────────────────────────────────────────────────
export const sendGuestOtp = async (whatsapp) =>
  (await request({ method: 'post', url: '/inquiries/guest/otp/send', data: { whatsapp } })).data;
export const verifyGuestOtp = async (whatsapp, code) =>
  (await request({ method: 'post', url: '/inquiries/guest/otp/verify', data: { whatsapp, code } })).data;
export const createGuestCustomRequest = async (payload) =>
  (await request({ method: 'post', url: '/inquiries/guest', data: payload })).data;
export const getGuestInquiryAgents = async () => (await request({ method: 'get', url: '/inquiries/guest/agents' })).data;

