/**
 * API Service Layer
 * Connects AuthModal (and the rest of the frontend) to secure-auth-backend
 *
 * Backend runs on: http://localhost:5000   (config.port in security.config.js)
 * All auth routes are mounted at:  /api/auth
 * All upload routes are mounted at: /api/upload
 *
 * Set VITE_API_URL in your frontend .env to override the base URL.
 * e.g.  VITE_API_URL=http://localhost:5000
 */
import axios from 'axios';
import { supabase } from './config/supabaseClient';

const _apiBase = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || 'http://localhost:5000';
const BASE_API = _apiBase.endsWith('/api') ? _apiBase : `${_apiBase}/api`;

console.log('[API] _apiBase:', _apiBase);
console.log('[API] BASE_API:', BASE_API);

// ─── Token & user stores ───────────────────────────────────────────────────────
let _accessToken = localStorage.getItem('access_token') || null;

export const tokenStore = {
  get: () => _accessToken,
  set: (token) => {
    _accessToken = token;
    if (token) localStorage.setItem('access_token', token);
    else localStorage.removeItem('access_token');
  },
  clear: () => {
    _accessToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },
};

export const userStore = {
  get: () => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  },
  set: (user) => localStorage.setItem('user', JSON.stringify(user)),
  clear: () => localStorage.removeItem('user'),
};

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_API,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// attach bearer from tokenStore
api.interceptors.request.use((cfg) => {
  const t = tokenStore.get();
  if (t) cfg.headers = { ...(cfg.headers || {}), Authorization: `Bearer ${t}` };
  console.debug('[API request]', cfg.method, cfg.url, cfg.data || cfg.params);
  console.debug('[API token]', t ? `present (${t.slice(0, 20)}...)` : 'MISSING — request will fail auth');
  return cfg;
});

// logging + propagate errors
api.interceptors.response.use(
  (res) => {
    console.debug('[API response]', res.status, res.config.url, res.data);
    return res;
  },
  (err) => {
    console.debug('[API error raw]', err?.response?.status, err?.response?.data);
    return Promise.reject(err);
  }
);

// centralized request wrapper
export const request = async (config) => {
  try {
    const res = await api.request(config);
    return res;
  } catch (err) {
    const serverMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Request failed';
    const e = new Error(serverMsg);
    e.response = err.response;
    e.original = err;
    throw e;
  }
};

// ─── Auth endpoints ────────────────────────────────────────────────────────────
export const registerClient = (formData) =>
  request({
    method: 'post',
    url: '/auth/register/client',
    data: {
      email:     formData.email,
      password:  formData.password,
      firstName: formData.firstName,
      lastName:  formData.lastName,
      phone:     formData.phone || undefined,
    },
  });

export const registerAgent = async (data) => {
  const res = await request({
    method: 'post',
    url: '/auth/register/agent',
    data,
  });
  console.debug('[registerAgent] full response:', JSON.stringify(res?.data));
  console.debug('[registerAgent] accessToken:', res?.data?.accessToken ?? 'NOT FOUND IN RESPONSE');
  if (res?.data?.accessToken) tokenStore.set(res.data.accessToken);
  if (res?.data?.data?.user)  userStore.set(res.data.data.user);
  return res;
};

export const login = async (formData) => {
  const res = await request({
    method: 'post',
    url: '/auth/login',
    data: { email: formData.email, password: formData.password },
  });
  if (res?.data?.data?.accessToken) {
    tokenStore.set(res.data.data.accessToken);
    await supabase.auth.setSession({
      access_token: res.data.data.accessToken,
      refresh_token: res.data.data.refreshToken || '',
    });
  }
  if (res?.data?.data?.refreshToken) {
    localStorage.setItem('refresh_token', res.data.data.refreshToken);
  }
  if (res?.data?.data?.user) userStore.set(res.data.data.user);
  return res;
};

export const googleLogin = async (idToken) => {
  const res = await request({
    method: 'post',
    url: '/auth/google',
    data: { idToken },
  });
  if (res?.data?.data?.accessToken) {
    tokenStore.set(res.data.data.accessToken);
    await supabase.auth.setSession({
      access_token: res.data.data.accessToken,
      refresh_token: res.data.data.refreshToken || '',
    });
  }
  if (res?.data?.data?.refreshToken) {
    localStorage.setItem('refresh_token', res.data.data.refreshToken);
  }
  if (res?.data?.data?.user) userStore.set(res.data.data.user);
  return res;
};

export const logout = async () => {
  try { await request({ method: 'post', url: '/auth/logout' }); } finally {
    tokenStore.clear(); userStore.clear();
  }
};

export const refreshToken = async () => {
  const storedRefreshToken = localStorage.getItem('refresh_token');
  console.debug('[refreshToken] stored token:', storedRefreshToken ? 'present' : 'MISSING');
  const res = await request({
    method: 'post',
    url: '/auth/refresh',
    data: { refreshToken: storedRefreshToken },
  });
  if (res?.data?.data?.accessToken) {
    tokenStore.set(res.data.data.accessToken);
  }
  return res;
};

export const getMe = () => request({ method: 'get', url: '/auth/me' });

export const requestPasswordReset = (email) =>
  request({ method: 'post', url: '/auth/password-reset/request', data: { email } });

// ─── Uploads ──────────────────────────────────────────────────────────────────
export const uploadAgentDocuments = (files, agentId) => {
  const form = new FormData();
  if (files.incorporation) form.append('incorporation', files.incorporation);
  if (files.tourism)       form.append('tourism',       files.tourism);
  if (files.krapin)        form.append('krapin',        files.krapin);
  if (agentId)             form.append('agentId',       agentId);
  return request({
    method: 'post',
    url: '/documents',
    data: form,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export default {
  registerClient,
  registerAgent,
  login,
  googleLogin,
  logout,
  refreshToken,
  getMe,
  requestPasswordReset,
  uploadAgentDocuments,
  tokenStore,
  userStore,
};