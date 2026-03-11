// services/packagesApi.js
const BASE_URL = import.meta.env.VITE_API_URL;

const apiFetch = async (path, { headers = {}, ...options } = {}) => {
  const token = localStorage.getItem('accessToken');

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  return res;
};

const PACKAGE_SCALARS = [
  "name", "type", "location", "description",
  "price", "original_price", "discount", "duration",
  "available_from", "available_to", "max_group_size", "min_group_size",
  "makkah_hotel_name", "makkah_hotel_rating", "makkah_hotel_distance",
  "makkah_hotel_address", "makkah_check_in_date", "makkah_check_out_date",
  "madinah_hotel_name", "madinah_hotel_rating", "madinah_hotel_distance",
  "madinah_hotel_address", "madinah_check_in_date", "madinah_check_out_date",
];

const buildFormData = (formData, imageFiles = []) => {
  const body = new FormData();
  PACKAGE_SCALARS.forEach((k) => {
    if (formData[k] != null && formData[k] !== "") body.append(k, formData[k]);
  });
  body.append("highlights", JSON.stringify(formData.highlights ?? []));
  body.append("inclusions", JSON.stringify(formData.inclusions ?? []));
  body.append("exclusions", JSON.stringify(formData.exclusions ?? []));
  imageFiles.forEach((file) => body.append("images", file));
  return body;
};

const handleResponse = async (res) => {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Request failed (${res.status})`);
  }
  return res.json();
};

/** Fetch all ACTIVE packages from every agent (public listing page) */
export const getAllActivePackages = async () => {
  const res = await apiFetch("/api/packages/all-active");
  return handleResponse(res);
};

/** Fetch all packages belonging to the logged-in agent */
export const getAgentPackages = async () => {
  const res = await apiFetch("/api/packages/getagentpackages");
  return handleResponse(res);
};

/** Create a new package (multipart/form-data) */
export const createPackage = async (formData, imageFiles = []) => {
  const body = buildFormData(formData, imageFiles);
  const res  = await apiFetch("/api/packages/create-packages", {
    method: "POST",
    body,
  });
  return handleResponse(res);
};

/** Fetch a single package by ID */
export const getPackageById = async (id) => {
  const res = await apiFetch(`/api/packages/${id}`);
  return handleResponse(res);
};

/** Update an existing package (multipart/form-data) */
export const updatePackage = async (id, formData, imageFiles = []) => {
  const body = buildFormData(formData, imageFiles);
  const res  = await apiFetch(`/api/packages/${id}`, {
    method: "PUT",
    body,
  });
  return handleResponse(res);
};

/** Delete a package by ID */
export const deletePackage = async (id) => {
  const res = await apiFetch(`/api/packages/${id}`, { method: "DELETE" });
  return handleResponse(res);
};