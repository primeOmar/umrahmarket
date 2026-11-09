// Passport upload for Lipa Mdogo Mdogo savers. Unlike the booking-time
// passport check (PassportVerificationModal, which is tied to one package),
// this stores one passport on the savings account; it is attached to the
// package automatically when the pilgrim books with their savings.
import React, { useEffect, useMemo, useState } from 'react';
import { X, Upload, ShieldCheck, Loader2, AlertCircle, Camera } from 'lucide-react';
import { uploadSavingsPassport, errorMessage } from './savingsApi';

const todayPlusMonths = (m) => {
  const d = new Date();
  d.setMonth(d.getMonth() + m);
  return d.toISOString().slice(0, 10);
};

export default function SavingsPassportForm({ onClose, onSaved, attemptsRemaining = 3 }) {
  const [form, setForm] = useState({
    passportNumber: '', surname: '', givenNames: '', nationality: 'KEN',
    passportCountry: 'Kenya', dateOfBirth: '', passportExpiry: '',
  });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [busy, onClose]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onFile = (e) => {
    const f = e.target.files?.[0];
    setError(null);
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      setError('Please choose a JPG, PNG or WebP photo of your passport.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('That photo is too large. Please use one under 10 MB.');
      return;
    }
    setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!file) return setError('Please add a photo of your passport photo page.');
    if (!/^[A-Za-z0-9]{4,20}$/.test(form.passportNumber.trim())) return setError('Passport number should be 4–20 letters and numbers.');
    if (!form.surname.trim()) return setError('Surname is required.');
    if (!form.passportExpiry) return setError('Passport expiry date is required.');
    if (form.passportExpiry < todayPlusMonths(6)) return setError('Your passport must be valid for at least 6 more months. Please renew it first.');

    setBusy(true);
    try {
      const res = await uploadSavingsPassport({
        ...form,
        passportNumber: form.passportNumber.trim().toUpperCase(),
        surname: form.surname.trim(),
        givenNames: form.givenNames.trim(),
        nationality: form.nationality.trim().toUpperCase().slice(0, 3),
      }, file);
      setResult(res);
      if (res.canProceed) onSaved?.(res.data);
    } catch (err) {
      setError(errorMessage(err, 'Could not upload your passport. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20';
  const label = 'mb-1 block text-xs font-semibold text-gray-600';

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Upload passport">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-bold text-gray-900">Upload your passport</h2>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {result?.canProceed ? (
          <div className="px-5 py-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <ShieldCheck className="h-7 w-7 text-emerald-600" />
            </div>
            <p className="text-lg font-bold text-gray-900">{result.status === 'verified' ? 'Passport verified' : 'Passport received'}</p>
            <p className="mt-2 text-sm text-gray-600">{result.message}</p>
            <button type="button" onClick={onClose} className="mt-6 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 px-5 py-5">
            <p className="text-sm text-gray-600">
              Upload a clear photo of your passport's <strong>photo page</strong> and type the details exactly as printed. It's stored securely and only shared with the agent you book with.
            </p>

            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-4 text-center hover:bg-emerald-50">
              {preview ? (
                <img src={preview} alt="Passport preview" className="max-h-40 rounded-lg object-contain" />
              ) : (
                <>
                  <Camera className="h-7 w-7 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700">Take or choose a photo</span>
                  <span className="text-xs text-gray-500">JPG, PNG or WebP · whole page flat, in good light</span>
                </>
              )}
              <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={onFile} className="sr-only" />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={label} htmlFor="pp-number">Passport number</label>
                <input id="pp-number" className={`${input} uppercase`} value={form.passportNumber} onChange={set('passportNumber')} autoComplete="off" required />
              </div>
              <div>
                <label className={label} htmlFor="pp-surname">Surname</label>
                <input id="pp-surname" className={input} value={form.surname} onChange={set('surname')} required />
              </div>
              <div>
                <label className={label} htmlFor="pp-given">Given names</label>
                <input id="pp-given" className={input} value={form.givenNames} onChange={set('givenNames')} />
              </div>
              <div>
                <label className={label} htmlFor="pp-dob">Date of birth</label>
                <input id="pp-dob" type="date" className={input} value={form.dateOfBirth} onChange={set('dateOfBirth')} />
              </div>
              <div>
                <label className={label} htmlFor="pp-expiry">Expiry date</label>
                <input id="pp-expiry" type="date" min={todayPlusMonths(6)} className={input} value={form.passportExpiry} onChange={set('passportExpiry')} required />
              </div>
              <div>
                <label className={label} htmlFor="pp-country">Issuing country</label>
                <input id="pp-country" className={input} value={form.passportCountry} onChange={set('passportCountry')} />
              </div>
              <div>
                <label className={label} htmlFor="pp-nat">Nationality code</label>
                <input id="pp-nat" className={`${input} uppercase`} maxLength={3} value={form.nationality} onChange={set('nationality')} placeholder="KEN" />
              </div>
            </div>

            {(error || (result && !result.canProceed)) && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  {error || result.message}
                  {result && !result.canProceed && result.data?.attemptsRemaining != null && (
                    <> ({result.data.attemptsRemaining} attempt{result.data.attemptsRemaining === 1 ? '' : 's'} left before manual review)</>
                  )}
                </span>
              </div>
            )}

            <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-semibold text-white shadow-md disabled:opacity-60">
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking your passport…</> : <><Upload className="h-4 w-4" /> Upload passport</>}
            </button>
            {attemptsRemaining < 3 && !result && (
              <p className="text-center text-xs text-gray-400">{attemptsRemaining} automatic check{attemptsRemaining === 1 ? '' : 's'} left — after that our team reviews it manually.</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
