// Lipa Mdogo Mdogo — API client. Goes through api.js `request`, so the bearer
// token, auto-refresh and same-origin proxy all apply.
import { request } from '../api';

const unwrap = (r) => r.data;

export const getSavingsSummary = () =>
  request({ method: 'get', url: '/savings/summary' }).then(unwrap);

export const getSavingsTransactions = (limit = 25, offset = 0) =>
  request({ method: 'get', url: '/savings/transactions', params: { limit, offset } }).then(unwrap);

export const updateSavingsGoal = ({ goalKes = null, goalPackageId = null }) =>
  request({ method: 'put', url: '/savings/goal', data: { goalKes, goalPackageId } }).then(unwrap);

export const startMpesaDeposit = ({ amount, phone }) =>
  request({ method: 'post', url: '/savings/deposits/mpesa', data: { amount, phone } }).then(unwrap);

export const startCardDeposit = ({ amount }) =>
  request({ method: 'post', url: '/savings/deposits/card', data: { amount } }).then(unwrap);

export const getDepositStatus = (transactionId) =>
  request({ method: 'get', url: `/savings/deposits/${transactionId}/status` }).then(unwrap);

export const verifyCardDeposit = (orderTrackingId) =>
  request({ method: 'post', url: '/savings/deposits/card/verify', data: { orderTrackingId } }).then(unwrap);

export const getSavingsPackages = () =>
  request({ method: 'get', url: '/savings/packages' }).then(unwrap);

export const redeemSavings = (packageId) =>
  request({ method: 'post', url: '/savings/redeem', data: { packageId } }).then(unwrap);

export const getSavingsPassport = () =>
  request({ method: 'get', url: '/savings/passport' }).then(unwrap);

export const uploadSavingsPassport = (details, file) => {
  const form = new FormData();
  Object.entries(details).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') form.append(k, v);
  });
  form.append('passport', file, file.name || 'passport.jpg');
  // api.js's interceptor lets Axios set the multipart boundary header.
  return request({ method: 'post', url: '/savings/passport', data: form, timeout: 120_000 }).then(unwrap);
};

export const requestSurplus = (payload) =>
  request({ method: 'post', url: '/savings/surplus', data: payload }).then(unwrap);

export const getSavingsNotifications = () =>
  request({ method: 'get', url: '/savings/notifications' }).then(unwrap);

export const markSavingsNotificationsRead = (ids) =>
  request({ method: 'post', url: '/savings/notifications/read', data: { ids } }).then(unwrap);

export async function downloadSavingsReceipt(transactionId, receiptNo) {
  const res = await request({
    method: 'get',
    url: `/savings/transactions/${transactionId}/receipt`,
    responseType: 'blob',
  });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${receiptNo || 'receipt'}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Best human-readable message out of an api.js error. */
export const errorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  const d = err?.data;
  if (Array.isArray(d?.details) && d.details.length) return d.details.map((x) => x.message).join(' ');
  return d?.message || d?.error || err?.message || fallback;
};

export const fmtKes = (n) => `KES ${Math.round(Number(n) || 0).toLocaleString('en-KE')}`;
export const fmtUsd = (n) => `USD ${Math.round(Number(n) || 0).toLocaleString('en-US')}`;

export const SAVINGS_PATH = '/lipa-mdogo-mdogo';
