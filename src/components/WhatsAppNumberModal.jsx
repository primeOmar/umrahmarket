
import React, { useState } from 'react';
import { Phone, X, Loader2 } from 'lucide-react';
import { request, userStore } from '../api';

function normalisePhone(raw) {
  const d = raw.replace(/\D/g, '');
  if (d.startsWith('254') && d.length === 12) return d;
  if (d.startsWith('0') && d.length === 10) return '254' + d.slice(1);
  if ((d.startsWith('7') || d.startsWith('1')) && d.length === 9) return '254' + d;
  return null;
}
const SAFARICOM_RE = /^254[17]\d{8}$/;

const WhatsAppNumberModal = ({ onSaved, onSkip }) => {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const norm = normalisePhone(phone);
    if (!norm || !SAFARICOM_RE.test(norm)) {
      setError('Enter a valid Safaricom number (e.g. 0712 345 678)');
      return;
    }
    setSaving(true);
    try {
      const res = await request({
        method: 'post',
        url: '/profiles/whatsapp-number',
        data: { whatsappNumber: `+${norm}` },
      });
      const updatedUser = res?.data?.user;
      if (updatedUser) userStore.set(updatedUser);
      onSaved?.(updatedUser);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save your number — try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl overflow-hidden max-w-sm w-full shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
              <Phone className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-gray-900">Add your WhatsApp number</p>
          </div>
          {onSkip && (
            <button onClick={onSkip} className="p-1.5 rounded-full hover:bg-gray-100">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          )}
        </div>

        <div className="px-5 py-5 space-y-3">
          <p className="text-sm text-gray-500">
            We'll send your booking confirmations, receipts, and travel updates here — no spam, just what you need for your trip.
          </p>

          <div>
            <div className={`flex items-center border-2 rounded-xl overflow-hidden ${error ? 'border-red-400' : 'border-gray-200 focus-within:border-emerald-500'}`}>
              <span className="px-3 py-3 text-gray-500 font-mono text-sm bg-gray-50 border-r border-gray-200">+254</span>
              <input
                autoFocus
                value={phone}
                onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 9)); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder="712 345 678"
                className="flex-1 px-3 py-3 focus:outline-none font-mono text-gray-900"
              />
            </div>
            {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          {onSkip && (
            <button onClick={onSkip} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 rounded-lg">
              Later
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || phone.length < 9}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save number'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppNumberModal;