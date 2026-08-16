// services/blogApi.js
// Self-contained fetch wrapper matching the `saFetch`/`saApi` pattern used
// inside SuperAdminDashboard.jsx (same token keys, same auto-refresh-on-401
// behavior) so BlogTab doesn't depend on anything not already in your repo.

const _base = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5000';
const BASE_API = _base.endsWith('/api') ? _base : `${_base}/api`;

const getToken = () => localStorage.getItem('superadmin_token');

let _refreshing = false;
let _queue = [];
const processQueue = (err, token) => {
  _queue.forEach(({ resolve, reject }) => (err ? reject(err) : resolve(token)));
  _queue = [];
};

const blogFetch = async (url, options = {}) => {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const doRequest = (token) =>
    fetch(`${BASE_API}${url}`, {
      ...options,
      headers: {
        // Skip Content-Type for FormData — the browser sets it (with the
        // correct multipart boundary) automatically, and setting it
        // manually here would break that.
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

  let res = await doRequest(getToken());
  if (res.status !== 401) return res;

  if (_refreshing) {
    return new Promise((resolve, reject) => {
      _queue.push({ resolve: (t) => resolve(doRequest(t)), reject });
    });
  }

  _refreshing = true;
  try {
    const refreshToken = localStorage.getItem('superadmin_refresh_token');
    if (!refreshToken) throw new Error('No refresh token');

    const refreshRes = await fetch(`${BASE_API}/superadmin/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!refreshRes.ok) throw new Error('Refresh failed');

    const data = await refreshRes.json();
    const newToken = data?.data?.accessToken || data?.accessToken;
    if (!newToken) throw new Error('No new token in refresh response');

    localStorage.setItem('superadmin_token', newToken);
    processQueue(null, newToken);
    return doRequest(newToken);
  } catch (err) {
    processQueue(err, null);
    window.location.href = '/superadmin/login';
    throw err;
  } finally {
    _refreshing = false;
  }
};

const unwrap = async (res) => {
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    throw new Error(body.message || `Request failed (${res.status})`);
  }
  return body.data;
};

// ── Reads ───────────────────────────────────────────────────────────────────
export const getBlogPosts = async ({ status, category, search } = {}) => {
  const params = new URLSearchParams();
  if (status && status !== 'all')     params.set('status', status);
  if (category && category !== 'all') params.set('category', category);
  if (search)                         params.set('search', search);
  const qs = params.toString();
  const res = await blogFetch(`/superadmin/blog${qs ? `?${qs}` : ''}`, { method: 'GET' });
  return unwrap(res);
};

export const getBlogPost = async (id) => {
  const res = await blogFetch(`/superadmin/blog/${id}`, { method: 'GET' });
  return unwrap(res);
};

// ── Writes ──────────────────────────────────────────────────────────────────
export const createBlogPost = async (post) => {
  const res = await blogFetch('/superadmin/blog', { method: 'POST', body: JSON.stringify(post) });
  return unwrap(res);
};

export const updateBlogPost = async (id, post) => {
  const res = await blogFetch(`/superadmin/blog/${id}`, { method: 'PUT', body: JSON.stringify(post) });
  return unwrap(res);
};

export const deleteBlogPost = async (id) => {
  const res = await blogFetch(`/superadmin/blog/${id}`, { method: 'DELETE' });
  return unwrap(res);
};

// ── Media upload ────────────────────────────────────────────────────────────
// Images: uploaded through your own backend (multipart POST), same pattern
// as package images / agent documents — never touches R2 CORS.
// Video: backend hands out a presigned R2 URL, browser PUTs the file
// straight to R2 (bypassing your server) — required so a large video
// doesn't route through Render's request limits. This path DOES need the
// R2 bucket's CORS policy to allow your frontend origin(s).
export const uploadBlogMedia = async (file, mediaType, onProgress) => {
  if (mediaType === 'image') return uploadBlogImage(file, onProgress);
  if (mediaType === 'video') return uploadBlogVideo(file, onProgress);
  throw new Error(`Unsupported mediaType: ${mediaType}`);
};

const uploadBlogImage = async (file, onProgress) => {  const formData = new FormData();
  formData.append('image', file);

  const token = getToken();

  const data = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_API}/superadmin/blog/upload-image`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && body.success !== false) resolve(body.data);
        else reject(new Error(body.message || `Upload failed (${xhr.status})`));
      } catch {
        reject(new Error('Upload failed — invalid server response'));
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(formData);
  });

  return data; // { publicUrl, key }
};

const uploadBlogVideo = async (file, onProgress) => {
  const presignRes = await blogFetch('/superadmin/blog/upload-url', {
    method: 'POST',
    body: JSON.stringify({ fileName: file.name, contentType: file.type, mediaType: 'video' }),
  });
  const { uploadUrl, key, publicUrl, maxBytes } = await unwrap(presignRes);

  if (maxBytes && file.size > maxBytes) {
    throw new Error(`File too large — max ${(maxBytes / (1024 * 1024)).toFixed(0)}MB for video`);
  }

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Upload to storage failed')));
    xhr.onerror = () => reject(new Error('Upload to storage failed'));
    xhr.send(file);
  });

  return { publicUrl, key };
};

// ── PDF attachment upload ───────────────────────────────────────────────────
// Same backend-proxy pattern as uploadBlogImage — used for attaching a
// source document (e.g. a full magazine/newspaper issue a post references)
// that readers can open below the post.
export const uploadBlogAttachment = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('attachment', file);

  const token = getToken();

  const data = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_API}/superadmin/blog/upload-attachment`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && body.success !== false) resolve(body.data);
        else reject(new Error(body.message || `Upload failed (${xhr.status})`));
      } catch {
        reject(new Error('Upload failed — invalid server response'));
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(formData);
  });

  return data; // { publicUrl, key, name }
};