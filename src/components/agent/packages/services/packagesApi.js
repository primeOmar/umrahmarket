import { request, tokenStore } from '../../../../api';
import { formatDistanceMeters } from '../../../../utils/packageUtils';

// ─────────────────────────────────────────────
// FORM DATA BUILDER
// ─────────────────────────────────────────────

const PACKAGE_SCALARS = [
  'name', 'type', 'location', 'description',
  'price', 'original_price', 'discount', 'duration',
  'available_from', 'available_to', 'max_group_size', 'min_group_size',
  'makkah_hotel_name', 'makkah_hotel_rating', 'makkah_hotel_distance',
  'makkah_hotel_address', 'makkah_check_in_date', 'makkah_check_out_date',
  'madinah_hotel_name', 'madinah_hotel_rating', 'madinah_hotel_distance',
  'madinah_hotel_address', 'madinah_check_in_date', 'madinah_check_out_date',
];

const buildFormData = (formData, imageFiles = [], keepImageUrls = []) => {
  const body = new FormData();
  PACKAGE_SCALARS.forEach((k) => {
    if (formData[k] != null && formData[k] !== '') body.append(k, formData[k]);
  });
  body.append('highlights', JSON.stringify(formData.highlights ?? []));
  body.append('inclusions',  JSON.stringify(formData.inclusions  ?? []));
  body.append('exclusions',  JSON.stringify(formData.exclusions  ?? []));
  // Age-tier pricing (adult/child/minor_child/infant) — sent as a single
  // JSON object; server falls back any blank tier to the adult price.
  if (formData.price_tiers) {
    body.append('price_tiers', JSON.stringify(formData.price_tiers));
  }
  // Existing photos the agent kept (edit) or carried over (duplicate) —
  // newly uploaded files are appended separately below and merged server-side.
  if (Array.isArray(keepImageUrls) && keepImageUrls.length > 0) {
    body.append('existing_image_urls', JSON.stringify(keepImageUrls));
  }
  imageFiles.forEach((file) => body.append('images', file));
  return body;
};


export const getAllActivePackages = async () => {
  // Public route — request() omits the Authorization header automatically
  // when there's no token (see api.js's request interceptor), so guests hit
  // this safely with no special-casing needed here.
  const res = await request({ method: 'get', url: '/packages/all-active' });
  return res.data;
};

export const getAgentPackages = async () => {
  const res = await request({ method: 'get', url: '/packages/getagentpackages' });
  return res.data;
};

export const createPackage = async (formData, imageFiles = [], keepImageUrls = []) => {
  const body = buildFormData(formData, imageFiles, keepImageUrls);
  const res = await request({
    method: 'post',
    url: '/packages/create-packages',
    data: body,
  });
  return res.data;
};

export const getPackageById = async (id) => {
  const res = await request({ method: 'get', url: `/packages/${id}` });
  return res.data;
};

export const updatePackage = async (id, formData, imageFiles = [], keepImageUrls = []) => {
  const body = buildFormData(formData, imageFiles, keepImageUrls);
  const res = await request({
    method: 'put',
    url: `/packages/${id}`,
    data: body,
  });
  return res.data;
};

export const deletePackage = async (id) => {
  const res = await request({ method: 'delete', url: `/packages/${id}` });
  return res.data;
};

export const toggleFavourite = async (packageId) => {
  const res = await request({
    method: 'post',
    url: '/favourites/toggle',
    data: { packageId },
  });
  return res.data;
};

export const getFavourites = async () => {
  const res = await request({ method: 'get', url: '/favourites' });
  return res.data;
};

export const getItinerary = async (packageId) => {
  const res = await request({ method: 'get', url: `/packages/${packageId}/itinerary` });
  return res.data;
};

export const saveItinerary = async (packageId, days) => {
  const res = await request({
    method: 'post',
    url: `/packages/${packageId}/itinerary`,
    data: { days },
  });
  return res.data;
};

export const normalise = (pkg) => {
  const imageUrls = Array.isArray(pkg.image_urls) && pkg.image_urls.length
    ? pkg.image_urls
    : Array.isArray(pkg.images) && pkg.images.length
      ? pkg.images
      : null;

  const coverImage = (imageUrls?.[0])
    || pkg.image
    || 'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?auto=format&fit=crop&w=800&q=80';

  return {
    ...pkg,
    title: pkg.name || pkg.title || 'Umrah Package',
    originalPrice: Number(pkg.original_price ?? pkg.price ?? 0),
    hotelRating: pkg.makkah_hotel_rating ? `${pkg.makkah_hotel_rating}★` : '',
    distance: formatDistanceMeters(pkg.makkah_hotel_distance, 'Haram') || pkg.distance || '',
    image:  coverImage,
    images: imageUrls ?? [coverImage],   // ← always an array for the gallery
    price: Number(pkg.price ?? 0),
    // Age-tier pricing for the booking modal. Older packages saved before
    // this feature won't have price_tiers — fall back all tiers to the base
    // price so booking logic never has to special-case a missing tier.
    priceTiers: {
      adult:       Number(pkg.price_tiers?.adult       ?? pkg.price ?? 0),
      child:       Number(pkg.price_tiers?.child       ?? pkg.price ?? 0),
      minor_child: Number(pkg.price_tiers?.minor_child ?? pkg.price ?? 0),
      infant:      Number(pkg.price_tiers?.infant      ?? pkg.price ?? 0),
    },
    duration: Number(pkg.duration ?? 7),
    discount: Number(pkg.discount ?? 0),
    rating: Number(pkg.makkah_hotel_rating ?? pkg.rating ?? 4.5),
    includes:   Array.isArray(pkg.inclusions)  ? pkg.inclusions  : Array.isArray(pkg.includes)  ? pkg.includes  : [],
    excludes:   Array.isArray(pkg.exclusions)  ? pkg.exclusions  : Array.isArray(pkg.excludes)  ? pkg.excludes  : [],
    highlights: Array.isArray(pkg.highlights)  ? pkg.highlights  : [],
    location: pkg.location || pkg.destination || 'Makkah & Madinah',
    type: pkg.type || (pkg.is_hajj ? 'hajj' : 'umrah'),
    // Real owner name for display (card/detail page "by {agent_name}").
    // No fake fallback here — better to hide the line than show a made-up agency.
    agent_name: pkg.agent_name || pkg.agency_name || pkg.agency || null,
    agency_name: pkg.agency_name || pkg.agency || null,
  };
};

export { tokenStore }; 