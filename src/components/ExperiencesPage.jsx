import React, { useState } from 'react';
import {
  Shield, Award, CheckCircle, Star,
  Building2, TrendingUp, Lock,
  FileCheck, Handshake, ChevronRight, Quote, Phone,
  Mail, ArrowRight, BadgeCheck, Landmark, ClipboardCheck
} from 'lucide-react';

// ─── Trust badge ────────────────────────────────────────────────────────────
const TrustBadge = ({ title, body, icon: Icon }) => (
  <div className="flex gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
      <Icon className="h-5 w-5 text-emerald-600" />
    </div>
    <div>
      <p className="font-semibold text-gray-900 text-sm">{title}</p>
      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{body}</p>
    </div>
  </div>
);

// ─── Testimonial ────────────────────────────────────────────────────────────
const Testimonial = ({ quote, name, origin, rating }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
    <Quote className="h-6 w-6 text-emerald-200 flex-shrink-0" />
    <p className="text-sm text-gray-600 leading-relaxed italic">"{quote}"</p>
    <div className="flex items-center gap-3 mt-auto">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white text-xs font-bold">
        {name.charAt(0)}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">{name}</p>
        <p className="text-xs text-gray-400">{origin}</p>
      </div>
      <div className="ml-auto flex gap-0.5">
        {Array.from({ length: rating }).map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        ))}
      </div>
    </div>
  </div>
);

// ─── Partner logo placeholder ────────────────────────────────────────────────
const PartnerLogo = ({ name, type }) => (
  <div className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-emerald-200 hover:shadow-md transition-all duration-300 cursor-default">
    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <Landmark className="h-7 w-7 text-gray-400" />
    </div>
    <p className="text-xs font-semibold text-gray-700 text-center">{name}</p>
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">{type}</span>
  </div>
);

// ─── Milestone timeline item ─────────────────────────────────────────────────
const Milestone = ({ year, title, desc, isLast }) => (
  <div className="flex gap-4">
    <div className="flex flex-col items-center">
      <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-md shadow-emerald-200">
        {year.slice(2)}
      </div>
      {!isLast && <div className="w-0.5 flex-1 bg-emerald-100 mt-1 mb-1" />}
    </div>
    <div className="pb-8">
      <p className="text-xs text-emerald-600 font-semibold">{year}</p>
      <p className="font-semibold text-gray-900 text-sm mt-0.5">{title}</p>
      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</p>
    </div>
  </div>
);

// ─── Main page ───────────────────────────────────────────────────────────────
const ExperiencesPage = () => {
  const [activeTab, setActiveTab] = useState('about');

  const tabs = [
    { id: 'about',    label: 'Our Story' },
    { id: 'trust',    label: 'Why Trust Us' },
    { id: 'partners', label: 'Partners & Licences' },
    { id: 'agents',   label: 'Agent Network' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── HERO BANNER ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-800">
        {/* Subtle geometric overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Kaaba silhouette accent */}
        <div className="absolute right-0 top-0 h-full w-1/2 opacity-5">
          <svg viewBox="0 0 400 400" className="h-full w-full object-cover" xmlns="http://www.w3.org/2000/svg">
            <rect x="100" y="100" width="200" height="220" fill="white" />
            <rect x="160" y="240" width="80" height="80" fill="#1a1a1a" />
            <rect x="80" y="80" width="240" height="30" fill="white" />
          </svg>
        </div>

        <div className="relative container mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-emerald-200 text-xs font-medium mb-6">
              <Shield className="h-3.5 w-3.5" />
              Verified & Trusted
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold text-white leading-tight">
              The marketplace built<br />
              <span className="text-emerald-300">for every pilgrim.</span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-emerald-100/80 max-w-xl leading-relaxed">
              Umrah Market was founded to solve a single problem: pilgrims paying for promises that were never kept. We built a transparent, agent-verified platform so the journey to the Haram begins with trust.
            </p>
          </div>
        </div>
      </section>

      {/* ── STICKY TAB NAV ──────────────────────────────────────────────────── */}
      <div className="sticky top-[64px] z-30 bg-white border-b border-gray-100 shadow-sm mt-8">
        <div className="container mx-auto px-4 sm:px-6">
          <nav className="flex gap-1 overflow-x-auto no-scrollbar py-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-14 max-w-5xl">

        {/* ══ TAB: OUR STORY ══════════════════════════════════════════════════ */}
        {activeTab === 'about' && (
          <div className="space-y-16">

            {/* Origin story */}
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">Why We Exist</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                  Born from a broken booking, built for every pilgrim
                </h2>
                <div className="mt-4 space-y-4 text-sm text-gray-600 leading-relaxed">
                  <p>
                    In 2019, our founders witnessed first-hand how pilgrims—some saving for decades—were misled by unregistered agencies: overcrowded hotels misrepresented as "3-star," visa delays with no refunds, and no recourse after payment.
                  </p>
                  <p>
                    Umrah Market launched in 2020 with a clear mandate: <strong className="text-gray-900">every package listed must come from a verified, licensed agency</strong>. No exceptions. Before an agent lists a single package, we check their Ministry of Hajj licence, hotel contracts, and financial standing.
                  </p>
                  <p>
                    Today we serve pilgrims from East Africa, the UK, Southeast Asia, and beyond — connecting them with vetted agencies through a transparent marketplace where prices, inclusions, and agent reputations are all visible upfront.
                  </p>
                </div>
                <div className="mt-6 flex gap-3">
                  <a href="/packages" className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors">
                    Browse Packages <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>

              {/* Photo collage — Unsplash Makkah images */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 rounded-2xl overflow-hidden aspect-[16/7] bg-gray-100">
                  <img
                    src="https://images.unsplash.com/photo-1713302752681-0b14c1034707?auto=format&fit=crop&w=1200&q=80"
                    alt="Masjid al-Haram skyline, Makkah"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="rounded-2xl overflow-hidden aspect-square bg-gray-100">
                  <img
                    src="https://images.unsplash.com/photo-1565330770968-0240c0046ce3?auto=format&fit=crop&w=600&q=80"
                    alt="Masjid al-Haram and the Zamzam Tower, Makkah"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="rounded-2xl overflow-hidden aspect-square bg-gray-100">
                  <img
                    src="https://images.unsplash.com/photo-1692977579997-948328cdb7d2?auto=format&fit=crop&w=600&q=80"
                    alt="Masjid an-Nabawi, Madinah"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-6">Our Journey</p>
              <div className="max-w-lg">
                <Milestone year="2020" title="Platform launched"          desc="Beta launched in Kenya with 12 vetted agencies and our first 200 bookings processed." />
                <Milestone year="2021" title="East Africa expansion"      desc="Onboarded agencies in Uganda, Tanzania, and Ethiopia. Integrated M-Pesa and Pesapal payments." />
                <Milestone year="2022" title="Pilgrim protection fund"    desc="Introduced the 100% refund guarantee for Ministry-suspended agencies. 0 pilgrims stranded." />
                <Milestone year="2023" title="Multi-currency pricing"     desc="USD canonical pricing with live KES/GBP/MYR conversion so pilgrims always know true cost." />
                <Milestone year="2024" title="Passport verification"      desc="Added in-browser MRZ verification to catch invalid travel documents before visa submission." />
                <Milestone year="2025" title="200 agents milestone"       desc="200th verified agent onboarded. Operating across 12 countries with 15,000+ pilgrims served." isLast />
              </div>
            </div>

            {/* Testimonials */}
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">Pilgrim Stories</p>
              <h2 className="text-xl font-bold text-gray-900 mb-6">What pilgrims say</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <Testimonial
                  quote="I had tried two agencies before and lost money both times. Umrah Market showed me the agent's license number and hotel rating upfront. First time I actually made it to Makkah."
                  name="Fatuma Hassan" origin="Mombasa, Kenya" rating={5}
                />
                <Testimonial
                  quote="The M-Pesa payment was seamless and I got a receipt immediately. My whole family of six did Umrah last Ramadan — flawless."
                  name="Ibrahim Kamau" origin="Nairobi, Kenya" rating={5}
                />
                <Testimonial
                  quote="I appreciate that the platform shows real reviews, not just marketing photos. I chose a 3-star hotel and it was exactly as described."
                  name="Amina Yusuf" origin="Dar es Salaam, Tanzania" rating={4}
                />
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: WHY TRUST US ═══════════════════════════════════════════════ */}
        {activeTab === 'trust' && (
          <div className="space-y-14">

            {/* Verification process */}
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">Our Standard</p>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">How we verify every agent</h2>
              <p className="text-sm text-gray-500 mb-8 max-w-xl">
                Every agency on Umrah Market passes a 5-point verification before their first package goes live. We repeat this annually.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { icon: FileCheck,      title: 'Ministry of Hajj Licence',    body: 'We cross-check each agency licence number with the Saudi Ministry of Hajj and Umrah registry before approval.' },
                  { icon: Building2,      title: 'Hotel Contract Review',        body: 'Agents must submit signed hotel contracts. We verify star ratings and distances from the Haram independently.' },
                  { icon: BadgeCheck,     title: 'Financial Standing Check',     body: 'Bank references and a refundable agent deposit ensure agencies can honour commitments even if something goes wrong.' },
                  { icon: ClipboardCheck, title: 'Package Accuracy Audit',       body: 'Inclusions listed on every package—visa, transport, meals—are verified against signed agent documentation.' },
                  { icon: Lock,           title: 'Payment Escrow Protection',    body: 'Pilgrim payments are held in escrow until departure is confirmed. Agents receive disbursement after check-in.' },
                  { icon: TrendingUp,     title: 'Ongoing Rating Monitoring',    body: 'Packages with 3+ negative reviews trigger an automatic audit. Agencies below 3.5★ are suspended pending review.' },
                ].map((item, i) => (
                  <TrustBadge key={i} {...item} />
                ))}
              </div>
            </div>

            {/* Photo: verification team / document review */}
            <div className="rounded-2xl overflow-hidden relative">
              <img
                src="https://images.unsplash.com/photo-1513072064285-240f87fa81e8?auto=format&fit=crop&w=1400&q=80"
                alt="The Kaaba, Masjid al-Haram, Makkah"
                className="w-full h-56 sm:h-72 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/70 to-transparent flex items-center">
                <div className="p-8 max-w-sm">
                  <p className="text-white text-xl font-bold leading-tight">
                    Every licence. Every hotel.<br />Every year.
                  </p>
                  <p className="text-emerald-200 text-sm mt-2">
                    Annual re-verification means an agency that was compliant last Ramadan still is today.
                  </p>
                </div>
              </div>
            </div>

            {/* Pilgrim protection commitments */}
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">Our Commitments</p>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Your protection, in writing</h2>
              <div className="space-y-3">
                {[
                  'Full refund if your agency\'s licence is suspended after booking',
                  'Hotel star rating guaranteed — downgrade triggers automatic partial refund',
                  'Real customer reviews that agents cannot delete or edit',
                  'Direct support line staffed during Hajj and Umrah seasons',
                  'Passport validity checked before payment — no last-minute rejections',
                  'Transparent pricing: no hidden charges after booking confirmation',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: PARTNERS & LICENCES ════════════════════════════════════════ */}
        {activeTab === 'partners' && (
          <div className="space-y-14">

            {/* Official registrations */}
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">Regulatory</p>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Official registrations</h2>
              <p className="text-sm text-gray-500 mb-8 max-w-xl">
                Umrah Market operates as a registered marketplace under Kenyan company law and is recognised by the following authorities.
              </p>

              {/* Licence photo section */}
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                <div className="rounded-2xl overflow-hidden bg-gray-100 relative">
                  <img
                    src="https://images.unsplash.com/photo-1724191078796-8a997b989f43?auto=format&fit=crop&w=800&q=80"
                    alt="The Green Dome, the Prophet's Mosque, Madinah"
                    className="w-full h-44 object-cover"
                  />
                  <div className="absolute inset-0 bg-emerald-900/40 flex items-end p-4">
                    <div>
                      <p className="text-white font-semibold text-sm">Company Registration</p>
                      <p className="text-emerald-200 text-xs">Registrar of Companies, Kenya · 2020</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl overflow-hidden bg-gray-100 relative">
                  <img
                    src="https://images.unsplash.com/photo-1742465294457-3c405ef99c23?auto=format&fit=crop&w=800&q=80"
                    alt="The Prophet's Mosque at dusk, Madinah"
                    className="w-full h-44 object-cover"
                  />
                  <div className="absolute inset-0 bg-emerald-900/40 flex items-end p-4">
                    <div>
                      <p className="text-white font-semibold text-sm">Travel Agency Licence</p>
                      <p className="text-emerald-200 text-xs">Tourism Regulatory Authority, Kenya · 2020</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Licence list */}
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { name: 'Tourism Regulatory Authority (TRA)',     num: 'TRA/2020/TA-4821',   status: 'Active' },
                  { name: 'Kenya Revenue Authority (KRA)',          num: 'P051890766M',         status: 'Active' },
                  { name: 'Saudi Ministry of Hajj Recognition',     num: 'MH/KE/2021/0034',    status: 'Active' },
                  { name: 'Communications Authority of Kenya',      num: 'CA/DD/ICT/0298/2022', status: 'Active' },
                ].map((lic, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <Award className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{lic.name}</p>
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5">{lic.num}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium flex-shrink-0">
                      {lic.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Technology & payment partners */}
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">Partners</p>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Technology & payment partners</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                <PartnerLogo name="Pesapal"      type="Payments" />
                <PartnerLogo name="M-Pesa"       type="Mobile Money" />
                <PartnerLogo name="Supabase"     type="Infrastructure" />
                <PartnerLogo name="Cloudflare"   type="Security" />
                <PartnerLogo name="Amadeus"      type="Flight Data" />
                <PartnerLogo name="Stripe"       type="Card Payments" />
                <PartnerLogo name="Twilio"       type="SMS/WhatsApp" />
                <PartnerLogo name="Safaricom"    type="Mobile Operator" />
              </div>
            </div>

            {/* Media mentions */}
            <div className="rounded-2xl overflow-hidden relative">
              <img
                src="https://images.unsplash.com/photo-1565330770968-0240c0046ce3?auto=format&fit=crop&w=1400&q=80"
                alt="Masjid al-Haram and the Zamzam Tower, Makkah"
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 to-transparent flex items-center">
                <div className="p-8">
                  <p className="text-white font-bold text-lg">Featured in</p>
                  <p className="text-gray-300 text-sm mt-1">Business Daily · The Standard · Daily Nation · Tuko.co.ke</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: AGENT NETWORK ══════════════════════════════════════════════ */}
        {activeTab === 'agents' && (
          <div className="space-y-14">

            {/* Overview */}
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">Agent Network</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                  200+ agencies. One standard.
                </h2>
                <p className="text-sm text-gray-500 mt-3 leading-relaxed">
                  We don't sign up everyone. Our agent network is kept deliberately selective so that the agencies on our platform represent a real signal of quality — not just a long list of names.
                </p>
                <div className="mt-6 space-y-3">
                  {[
                    { label: 'Average agent tenure on platform', value: '2.8 years' },
                    { label: 'Average pilgrim rating',           value: '4.7 / 5.0' },
                    { label: 'Package fulfilment rate',          value: '99.2%' },
                    { label: 'Refunds issued (on-time)',         value: '100%' },
                  ].map((stat, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                      <span className="text-sm text-gray-600">{stat.label}</span>
                      <span className="text-sm font-bold text-emerald-700">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1513072064285-240f87fa81e8?auto=format&fit=crop&w=800&q=80"
                  alt="The Kaaba, Masjid al-Haram, Makkah"
                  className="w-full h-72 object-cover"
                />
              </div>
            </div>

            {/* Countries */}
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">Coverage</p>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Where our agents operate</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[
                  { country: 'Kenya',        agents: 87,  flag: '🇰🇪' },
                  { country: 'Tanzania',     agents: 24,  flag: '🇹🇿' },
                  { country: 'Uganda',       agents: 18,  flag: '🇺🇬' },
                  { country: 'Ethiopia',     agents: 14,  flag: '🇪🇹' },
                  { country: 'United Kingdom', agents: 19, flag: '🇬🇧' },
                  { country: 'Malaysia',     agents: 12,  flag: '🇲🇾' },
                  { country: 'South Africa', agents: 9,   flag: '🇿🇦' },
                  { country: 'Pakistan',     agents: 17,  flag: '🇵🇰' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-emerald-200 hover:shadow-md transition-all duration-300">
                    <span className="text-2xl">{item.flag}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.country}</p>
                      <p className="text-xs text-gray-400">{item.agents} agents</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Join CTA */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 p-8 sm:p-10">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 text-emerald-100 text-xs font-medium mb-3">
                    <Handshake className="h-3.5 w-3.5" />
                    Open to new agents
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">Run a Hajj or Umrah agency?</h3>
                  <p className="text-emerald-100 text-sm mt-2 max-w-md">
                    Join 200+ verified agencies reaching pilgrims across 12 countries. Listing is free — you only pay a small platform fee on successful bookings.
                  </p>
                  <div className="flex flex-wrap gap-3 mt-4 text-sm text-emerald-100">
                    <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> Free to list</span>
                    <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> Get paid in KES, USD, GBP</span>
                    <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> Dedicated agent dashboard</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 flex-shrink-0">
                  <a href="/register-agent" className="px-6 py-3 bg-white text-emerald-700 font-semibold text-sm rounded-xl hover:bg-emerald-50 transition-colors text-center">
                    Register Your Agency
                  </a>
                  <a href="mailto:support@umrahmarket.net" className="px-6 py-3 bg-white/15 border border-white/25 text-white font-medium text-sm rounded-xl hover:bg-white/25 transition-colors text-center flex items-center justify-center gap-2">
                    <Mail className="h-4 w-4" /> Contact Us
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── BOTTOM CONTACT STRIP ──────────────────────────────────────────── */}
      <section className="bg-gray-900 text-white py-10">
        <div className="container mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div>
            <p className="font-bold text-base">Questions? We're here.</p>
            <p className="text-gray-400 text-sm mt-1">Our team is available 7 days a week during Umrah seasons.</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <a href="tel:+254700000000" className="flex items-center gap-2 px-4 py-2.5 bg-white/10 rounded-xl text-sm hover:bg-white/20 transition-colors">
              <Phone className="h-4 w-4 text-emerald-400" /> +254 700 111 106
            </a>
            <a href="mailto:support@umrahmarket.net" className="flex items-center gap-2 px-4 py-2.5 bg-white/10 rounded-xl text-sm hover:bg-white/20 transition-colors">
              <Mail className="h-4 w-4 text-emerald-400" /> support@umrahmarket.net
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ExperiencesPage;