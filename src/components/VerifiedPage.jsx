import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, ShieldCheck, ArrowLeft, X, ZoomIn,
  Building2, Landmark, FileCheck, BadgeCheck, Radio,
} from 'lucide-react';
import Header from './Header';


const DOCUMENTS = [
  {
    id: 'company-reg',
    icon: Building2,
    title: 'Certificate of Incorporation',
    issuer: 'Registrar of Companies, Kenya',
    number: 'PVT-XXXXXX',
    issued: '2020',
    status: 'Active',
    image: '/documents/company-reg.jpeg',
  },
  {
    id: 'tra-licence',
    icon: BadgeCheck,
    title: 'Travel Agency Licence',
    issuer: 'Tourism Regulatory Authority (TRA)',
    number: 'TRA/2020/TA-4821',
    issued: '2020',
    status: 'Active',
    image: '/documents/tra-licence.jpeg',
  },
  {
    id: 'kra-pin',
    icon: FileCheck,
    title: 'Tax Compliance Certificate',
    issuer: 'Kenya Revenue Authority (KRA)',
    number: 'P051890766M',
    issued: '2020',
    status: 'Active',
    image: '/documents/kra-certificate.jpeg',
  },
  {
    id: 'mohu-recognition',
    icon: Landmark,
    title: 'Ministry of Hajj Recognition',
    issuer: 'Saudi Ministry of Hajj & Umrah',
    number: 'MH/KE/2021/0034',
    issued: '2021',
    status: 'Active',
    image: '/documents/mohu-recognition.jpeg',
  },
  {
    id: 'ca-licence',
    icon: Radio,
    title: 'Communications Licence',
    issuer: 'Communications Authority of Kenya',
    number: 'CA/DD/ICT/0298/2022',
    issued: '2022',
    status: 'Active',
    image: '/documents/ca-licence.png',
  },
];

// ─────────────────────────────────────────────────────────────────────────────

const DocumentCard = ({ doc, onOpen }) => {
  const Icon = doc.icon;
  return (
    <button
      onClick={() => onOpen(doc)}
      className="group text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-300 overflow-hidden"
    >
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        <img
          src={doc.image}
          alt={doc.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement.querySelector('.doc-fallback').style.display = 'flex'; }}
        />
        <div className="doc-fallback hidden absolute inset-0 items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
          <Icon className="h-10 w-10 text-emerald-300" />
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 text-xs font-semibold text-gray-800">
            <ZoomIn className="h-3.5 w-3.5" /> View document
          </span>
        </div>
        <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-semibold shadow-sm">
          {doc.status}
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 leading-tight">{doc.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{doc.issuer}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <span className="text-[11px] font-mono text-gray-400 truncate">{doc.number}</span>
          <span className="text-[11px] text-gray-400 flex-shrink-0 ml-2">Issued {doc.issued}</span>
        </div>
      </div>
    </button>
  );
};

const DocumentLightbox = ({ doc, onClose }) => {
  const Icon = doc.icon;
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <Icon className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{doc.title}</p>
              <p className="text-xs text-gray-500 truncate">{doc.issuer}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 flex-shrink-0 ml-3">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <div className="overflow-auto flex-1 bg-gray-50 flex items-center justify-center p-4">
          <img
            src={doc.image}
            alt={doc.title}
            className="max-w-full max-h-full rounded-lg shadow-sm object-contain"
            onError={(e) => { e.currentTarget.replaceWith(Object.assign(document.createElement('div'), {
              className: 'flex flex-col items-center justify-center py-16 text-gray-400 text-sm',
              innerText: 'Document photo not yet uploaded',
            })); }}
          />
        </div>
        <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between flex-shrink-0 bg-white">
          <span className="text-xs font-mono text-gray-400">{doc.number}</span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" /> {doc.status} · Issued {doc.issued}
          </span>
        </div>
      </div>
    </div>
  );
};

const VerifiedPage = ({ currentUser, onLogout, onAuthSuccess }) => {
  const navigate = useNavigate();
  const [activeDoc, setActiveDoc] = useState(null);

  return (
    <div className="min-h-screen bg-gray-50">

      <Header currentUser={currentUser} onLogout={onLogout} onAuthSuccess={onAuthSuccess} />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-800">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <pattern id="verified-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#verified-grid)" />
          </svg>
        </div>

        <div className="relative container mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-emerald-200 text-sm font-medium mb-6 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-emerald-200 text-xs font-medium mb-6">
              <Shield className="h-3.5 w-3.5" />
              Verified Platform
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
              Everything that makes us verified,<br className="hidden sm:block" /> in one place.
            </h1>
            <p className="mt-4 text-base text-emerald-100/80 max-w-xl leading-relaxed">
              Umrah Market operates under real licences from real authorities. Below are our current registration and compliance documents — the same ones we require every agency on the platform to hold.
            </p>
          </div>
        </div>
      </section>

      {/* ── DOCUMENTS ────────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 sm:px-6 py-10 sm:py-14 max-w-5xl">
        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">Our Documents</p>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Registration &amp; compliance</h2>
        <p className="text-sm text-gray-500 mb-8 max-w-xl">
          Tap any document to view it in full.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DOCUMENTS.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} onOpen={setActiveDoc} />
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 sm:px-6 pb-14 max-w-5xl">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Questions about our verification process?</p>
            <p className="text-sm text-gray-500 mt-0.5">Every agency on Umrah Market is checked against the same documents shown here.</p>
          </div>
          <button
            onClick={() => navigate('/packages')}
            className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
          >
            Browse Packages
          </button>
        </div>
      </section>

      {activeDoc && <DocumentLightbox doc={activeDoc} onClose={() => setActiveDoc(null)} />}
    </div>
  );
};

export default VerifiedPage;
