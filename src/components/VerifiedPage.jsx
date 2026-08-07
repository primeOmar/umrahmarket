import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, ShieldCheck, ArrowLeft, X, ScanLine,
  Building2, Landmark, FileCheck, BadgeCheck, Store,
  ExternalLink, Copy, Check,
} from 'lucide-react';
import Header from './Header';
import Seo from './Seo';

const SITE_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'https://www.umrahmarket.net';


const DOCUMENTS = [
  {
    id: 'company-reg',
    icon: Building2,
    title: 'Certificate of Incorporation',
    issuer: 'Registrar of Companies, Kenya',
    number: 'PVT-7V7SB9Z',
    issued: '2026',
    status: 'Active',
    verify: {
      type: 'portal',
      portalUrl: 'https://brs.ecitizen.go.ke',
      portalLabel: 'brs.ecitizen.go.ke',
      steps: [
        'Go to the Business Registration Service portal on eCitizen.',
        'Open the "Company Search" or "Verify a Business" service.',
        'Enter the certificate/registration number shown above.',
        'Confirm the company name and status match this certificate.',
      ],
    },
  },
  {
    id: 'tra-licence',
    icon: BadgeCheck,
    title: 'Travel Agency Licence',
    issuer: 'Tourism Regulatory Authority (TRA)',
    number: 'TRA1/47/C04/90849',
    issued: '2026',
    status: 'Active',
    verify: {
      type: 'portal',
      portalUrl: 'https://verify.tra.go.ke',
      portalLabel: 'verify.tra.go.ke',
      steps: [
        'Go to the TRA licence verification portal.',
        'Enter the licence number shown above.',
        'TRA will confirm the licence is approved, in-date, and in the official registry.',
      ],
    },
  },
  {
    id: 'kra-pin',
    icon: FileCheck,
    title: 'Tax Compliance Certificate',
    issuer: 'Kenya Revenue Authority (KRA)',
    number: 'P052564055L',
    issued: '2026',
    status: 'Active',
    verify: {
      type: 'portal',
      portalUrl: 'https://itax.kra.go.ke/KRA-Portal/',
      portalLabel: 'itax.kra.go.ke',
      steps: [
        'Go to the iTax Portal and open the "TCC Checker" service.',
        'Enter the certificate/PIN number shown above.',
        'iTax will display the holder name and current certificate status.',
      ],
    },
  },
  {
    id: 'mohu-recognition',
    icon: Landmark,
    title: 'Ministry of Hajj Recognition',
    issuer: 'Saudi Ministry of Hajj & Umrah',
    number: 'MH/KE/2021/0034',
    issued: '2026',
    status: 'Active',
    verify: {
      type: 'manual',
      steps: [
        'This recognition is issued directly to Kenyan agencies by the Saudi Ministry of Hajj & Umrah and is not listed on a public self-service checker.',
        'To confirm authenticity, contact us with the reference number above and we\u2019ll share the underlying documentation.',
      ],
    },
  },
  {
    id: 'nairobi-trade-licence',
    icon: Store,
    title: 'Unified Business Permit (Trade Licence)',
    issuer: 'Nairobi City County',
    number: 'UBP430395',
    issued: '2026',
    status: 'Active',
    verify: {
      type: 'portal',
      portalUrl: 'https://nairobiservices.go.ke',
      portalLabel: 'nairobiservices.go.ke',
      steps: [
        'Scan the E-Verify QR code printed on the permit, or go to nairobiservices.go.ke directly.',
        'Enter the licence number shown above.',
        'Confirm the business name, Umrah Market Limited, and permit status match this certificate.',
      ],
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────

const DocumentCard = ({ doc, onOpen }) => {
  const Icon = doc.icon;
  return (
    <button
      onClick={() => onOpen(doc)}
      className="group text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-300 overflow-hidden p-5 flex flex-col items-center text-center"
    >
      <div className="flex items-center justify-center relative w-full">
        <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <Icon className="h-5 w-5 text-emerald-600" />
        </div>
        <span className="absolute right-0 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
          {doc.status}
        </span>
      </div>

      <div className="mt-4">
        <p className="text-sm font-semibold text-gray-900 leading-tight">{doc.title}</p>
        <p className="text-xs text-gray-500 mt-1">{doc.issuer}</p>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 w-full flex flex-col items-center gap-2">
        <div>
          <p className="text-[11px] text-gray-400">Licence / Cert. No.</p>
          <p className="text-xs font-mono text-gray-700 truncate">{doc.number}</p>
        </div>
        <span className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-semibold">
          <ScanLine className="h-3 w-3" /> Verify
        </span>
      </div>
    </button>
  );
};

const CopyableNumber = ({ value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — silently ignore
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-xs font-mono text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors"
      title="Copy to clipboard"
    >
      {value}
      {copied ? <Check className="h-3 w-3 text-emerald-600 flex-shrink-0" /> : <Copy className="h-3 w-3 text-gray-400 flex-shrink-0" />}
    </button>
  );
};

const VerifyModal = ({ doc, onClose }) => {
  const Icon = doc.icon;
  const { verify } = doc;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl overflow-hidden max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 mx-auto text-center">
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

        <div className="overflow-auto flex-1">
          {/* Status block */}
          <div className="bg-gray-50 px-5 py-6 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-emerald-600" />
            </div>

            <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" /> {doc.status} · Issued {doc.issued}
            </div>
          </div>

          {/* Details */}
          <div className="px-5 py-5 text-center">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Licence / Certificate No.
            </p>
            <CopyableNumber value={doc.number} />

            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-5 mb-2">
              How to verify
            </p>
            <ol className="space-y-2 text-left max-w-sm mx-auto">
              {verify.steps.map((step, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-gray-600 leading-snug">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>

            {verify.portalUrl && (
              <a
                href={verify.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
              >
                Open {verify.portalLabel} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
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
      <Seo
        title="Verification & Trust Documents | UmrahMarket Kenya"
        description="Review UmrahMarket's company, tax, and travel verification documents before booking with confidence."
        canonical={`${SITE_ORIGIN}/verified`}
      />

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

        <div className="relative container mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-emerald-200 text-sm font-medium mb-6 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-emerald-200 text-xs font-medium mb-6">
              <Shield className="h-3.5 w-3.5" />
              Verified Platform
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
              Everything that makes us verified,<br className="hidden sm:block" /> in one place.
            </h1>
            <p className="mt-4 text-base text-emerald-100/80 max-w-xl mx-auto leading-relaxed">
              Umrah Market operates under real licences from real authorities. Below are our current registration and compliance documents — check any of them directly with the issuing authority, the same way we require every agency on the platform to be verifiable.
            </p>
          </div>
        </div>
      </section>

      {/* ── DOCUMENTS ────────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 sm:px-6 py-10 sm:py-14 max-w-5xl text-center">
        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">Our Documents</p>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Registration &amp; compliance</h2>
        <p className="text-sm text-gray-500 mb-8 max-w-xl mx-auto">
          Tap any document to see its licence number and how to check it against the issuing authority yourself.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DOCUMENTS.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} onOpen={setActiveDoc} />
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 sm:px-6 pb-14 max-w-5xl">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 sm:p-8 flex flex-col items-center text-center justify-between gap-4">
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

      {activeDoc && <VerifyModal doc={activeDoc} onClose={() => setActiveDoc(null)} />}
    </div>
  );
};

export default VerifiedPage;