// services/packagesApi.js
const BASE_URL = import.meta.env.VITE_API_URL;


const appendJSON = (body, key, val) =>
  body.append(key, Array.isArray(val) ? JSON.stringify(val) : (val ?? "[]"));

export const createPackage = async (formData, imageFiles = []) => {
  const body = new FormData();

  // Scalar fields
  const scalars = [
    "name","type","location","description",
    "price","original_price","discount","duration",
    "available_from","available_to","max_group_size","min_group_size",
    "makkah_hotel_name","makkah_hotel_rating","makkah_hotel_distance",
    "makkah_hotel_address","makkah_check_in_date","makkah_check_out_date",
    "madinah_hotel_name","madinah_hotel_rating","madinah_hotel_distance",
    "madinah_hotel_address","madinah_check_in_date","madinah_check_out_date",
    "agent_number","agent_name",
  ];
  scalars.forEach((k) => { if (formData[k] != null) body.append(k, formData[k]); });

  // JSON array fields
  appendJSON(body, "highlights", formData.highlights);
  appendJSON(body, "inclusions", formData.inclusions);
  appendJSON(body, "exclusions", formData.exclusions);

  // Images
  imageFiles.forEach((file) => body.append("images", file));

  const res = await fetch(`${BASE_URL}/packages`, { method: "POST", body });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create package");
  }
  return res.json();
};

export const getAllPackages = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const res = await fetch(`${BASE_URL}/packages${params ? `?${params}` : ""}`);
  if (!res.ok) throw new Error("Failed to fetch packages");
  return res.json();
};

export const getPackageById = async (id) => {
  const res = await fetch(`${BASE_URL}/packages/${id}`);
  if (!res.ok) throw new Error("Failed to fetch package");
  return res.json();
};

export const updatePackage = async (id, formData, imageFiles = []) => {
  const body = new FormData();
  const scalars = [
    "name","type","location","description",
    "price","original_price","discount","duration",
    "available_from","available_to","max_group_size","min_group_size",
    "makkah_hotel_name","makkah_hotel_rating","makkah_hotel_distance",
    "makkah_hotel_address","makkah_check_in_date","makkah_check_out_date",
    "madinah_hotel_name","madinah_hotel_rating","madinah_hotel_distance",
    "madinah_hotel_address","madinah_check_in_date","madinah_check_out_date",
    "agent_number","agent_name",
  ];
  scalars.forEach((k) => { if (formData[k] != null) body.append(k, formData[k]); });
  appendJSON(body, "highlights", formData.highlights);
  appendJSON(body, "inclusions", formData.inclusions);
  appendJSON(body, "exclusions", formData.exclusions);
  imageFiles.forEach((file) => body.append("images", file));

  const res = await fetch(`${BASE_URL}/packages/${id}`, { method: "PUT", body });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update package");
  }
  return res.json();
};

export const deletePackage = async (id) => {
  const res = await fetch(`${BASE_URL}/packages/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete package");
  return res.json();
};