import React, { useState, useEffect, useRef } from 'react';
import { Camera, Loader, X, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { getAgentProfile, updateAgentProfile, uploadAgentLogo } from '../api';

// Editable "agency profile" card for the Agent Dashboard Settings tab.
// This is what shows up on the PUBLIC agent profile page (AgentDetailPage)
// and is the content most likely to push a browsing client to actually
// book a package: logo, years in business, specialties, and a real bio.
const MAX_BIO = 2000;
const SUGGESTED_SPECIALTIES = [
  'Hajj Packages', 'Umrah Packages', 'Group Tours', 'Family Packages',
  'Luxury Umrah', 'Budget Umrah', 'Visa Assistance', 'Ziyarah Tours',
];

const AgentProfileSettings = ({ logoUrl: logoUrlProp, onLogoUpdated } = {}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [banner, setBanner] = useState(null); // { type: 'success' | 'error', message }
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    businessName: '',
    bio: '',
    yearsExperience: '',
    specialties: [],
    websiteUrl: '',
    officeMapsUrl: '',
    logoUrl: logoUrlProp || '',
  });
  const [specialtyInput, setSpecialtyInput] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getAgentProfile();
        const p = res?.profile;
        if (!cancelled && p) {
          setForm({
            businessName: p.businessName || '',
            bio: p.bio || '',
            yearsExperience: p.yearsExperience ?? '',
            specialties: p.specialties || [],
            websiteUrl: p.websiteUrl || '',
            officeMapsUrl: p.officeMapsUrl || '',
            logoUrl: p.logoUrl || '',
          });
        }
      } catch (err) {
        console.error('[AgentProfileSettings] load failed:', err?.message);
        if (!cancelled) setBanner({ type: 'error', message: 'Could not load your profile. Please refresh and try again.' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Keep in sync with the dashboard: if the logo is changed elsewhere
  // (e.g. the sidebar/topbar avatar), reflect it here too. Guarded by
  // the inequality check so this never fights with this component's
  // own optimistic update while an upload from *this* form is in flight.
  useEffect(() => {
    if (logoUrlProp && logoUrlProp !== form.logoUrl) {
      setForm((f) => ({ ...f, logoUrl: logoUrlProp }));
    }
  }, [logoUrlProp]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const addSpecialty = (value) => {
    const v = value.trim();
    if (!v) return;
    setForm((f) => (f.specialties.includes(v) ? f : { ...f, specialties: [...f.specialties, v] }));
    setSpecialtyInput('');
  };

  const removeSpecialty = (value) => {
    setForm((f) => ({ ...f, specialties: f.specialties.filter((s) => s !== value) }));
  };

  const handleLogoPick = () => fileInputRef.current?.click();

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    if (!/^image\/(png|jpe?g|webp|svg\+xml)$/.test(file.type)) {
      setBanner({ type: 'error', message: 'Logo must be a PNG, JPG, WEBP, or SVG image.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setBanner({ type: 'error', message: 'Logo must be under 5MB.' });
      return;
    }

    // Optimistic local preview while the upload is in flight
    const prevLogoUrl = form.logoUrl;
    const previewUrl = URL.createObjectURL(file);
    setForm((f) => ({ ...f, logoUrl: previewUrl }));
    onLogoUpdated?.(previewUrl);

    setUploadingLogo(true);
    setBanner(null);
    try {
      // POST /agents/me/logo persists logo_url onto the profile row itself
      // (see agent_profile.routes.js) — no follow-up save call needed.
      const res = await uploadAgentLogo(file);
      const logoUrl = res?.logoUrl;
      if (!logoUrl) throw new Error('Upload did not return a logo URL');

      setForm((f) => ({ ...f, logoUrl }));
      onLogoUpdated?.(logoUrl);
      setBanner({ type: 'success', message: 'Logo updated.' });
    } catch (err) {
      console.error('[AgentProfileSettings] logo upload failed:', err?.message);
      setForm((f) => ({ ...f, logoUrl: prevLogoUrl }));
      onLogoUpdated?.(prevLogoUrl);
      setBanner({ type: 'error', message: 'Logo upload failed. Please try again.' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setBanner(null);
    try {
      await updateAgentProfile({
        companyName: form.businessName,
        bio: form.bio,
        yearsExperience: form.yearsExperience === '' ? null : Number(form.yearsExperience),
        specialties: form.specialties,
        websiteUrl: form.websiteUrl,
        officeMapsUrl: form.officeMapsUrl,
        // Skip sending a transient blob: preview URL if Save is clicked
        // while a logo upload is still in flight — that's not a real,
        // durable URL and would corrupt the saved profile.
        ...(form.logoUrl && !form.logoUrl.startsWith('blob:') ? { logoUrl: form.logoUrl } : {}),
      });
      setBanner({ type: 'success', message: 'Profile updated — clients will see these changes on your agency page.' });
    } catch (err) {
      console.error('[AgentProfileSettings] save failed:', err?.message);
      setBanner({ type: 'error', message: err?.message || 'Failed to save changes. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 flex items-center justify-center">
        <Loader className="h-5 w-5 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Agency Profile</h3>
        <p className="text-sm text-gray-500 mt-1">
          This is what clients see on your public agency page — a complete profile builds
          trust and drives package bookings.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {banner && (
          <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
            banner.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {banner.type === 'success' ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
            <span>{banner.message}</span>
          </div>
        )}

        {/* Logo */}
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="Agency logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-gray-300">{form.businessName?.charAt(0) || 'A'}</span>
            )}
            {uploadingLogo && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader className="h-5 w-5 text-white animate-spin" />
              </div>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={handleLogoPick}
              disabled={uploadingLogo}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-60"
            >
              <Camera className="h-4 w-4" />
              {form.logoUrl ? 'Change logo' : 'Upload logo'}
            </button>
            <p className="text-xs text-gray-400 mt-1.5">PNG, JPG, WEBP or SVG. Up to 5MB.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogoChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Agency Name</label>
            <input
              type="text"
              value={form.businessName}
              onChange={set('businessName')}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
            <input
              type="number"
              min="0"
              max="100"
              value={form.yearsExperience}
              onChange={set('yearsExperience')}
              placeholder="e.g. 8"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Website (optional)</label>
            <input
              type="url"
              value={form.websiteUrl}
              onChange={set('websiteUrl')}
              placeholder="https://youragency.com"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div> */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Office Location (Google Maps link)</label>
            <input
              type="url"
              value={form.officeMapsUrl}
              onChange={set('officeMapsUrl')}
              placeholder="https://maps.google.com/..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Bio */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Agency Bio</label>
            <span className={`text-xs ${form.bio.length > MAX_BIO ? 'text-red-500' : 'text-gray-400'}`}>
              {form.bio.length}/{MAX_BIO}
            </span>
          </div>
          <textarea
            rows={5}
            value={form.bio}
            onChange={set('bio')}
            maxLength={MAX_BIO}
            placeholder="Tell clients who you are, what makes your agency trustworthy, and why they should book with you — years in business, past pilgrims served, what's included, your team's expertise…"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Specialties */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Specialties</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.specialties.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-full border border-blue-100">
                {s}
                <button type="button" onClick={() => removeSpecialty(s)} className="hover:text-blue-900">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={specialtyInput}
              onChange={(e) => setSpecialtyInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSpecialty(specialtyInput); } }}
              placeholder="Add a specialty and press Enter"
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => addSpecialty(specialtyInput)}
              className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
            >
              <Plus className="h-4 w-4 text-gray-500" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {SUGGESTED_SPECIALTIES.filter((s) => !form.specialties.includes(s)).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addSpecialty(s)}
                className="text-xs px-2.5 py-1 rounded-full border border-dashed border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-all"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || form.bio.length > MAX_BIO}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-60 flex items-center gap-2"
          >
            {saving && <Loader className="h-4 w-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentProfileSettings;