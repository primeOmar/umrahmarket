// FaqSection.jsx
// Drop-in, self-contained FAQ block for GuidancePage.jsx (or anywhere else).
// Two things happen here on purpose:
//   1. Visible <details>/<summary> Q&A — real content, real HTML, no JS
//      required to read it (matters for SSR + any crawler that doesn't
//      execute JS).
//   2. FAQPage JSON-LD mirroring the same questions — this is the format
//      AI answer engines (ChatGPT, Perplexity, Google AI Overviews) and
//      Google's classic FAQ rich results both parse most reliably. Keep
//      the two in sync: the JSON-LD should never say something the visible
//      page doesn't also say.
//
// Questions below are written the way people actually type them into an
// AI assistant ("how much does umrah cost from kenya"), not as keyword
// phrases — that phrasing match is what gets a passage selected/quoted.
// Swap in your own real, current figures before shipping; placeholder
// ranges are marked.
import React from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    q: 'How much does an Umrah package cost from Kenya?',
    a: 'Umrah package prices from Kenya typically range from budget economy options to premium packages, depending on hotel star rating, distance from the Haram, flight class, and season. On UmrahMarket, every listed price is set directly by the verified agent posting it, and you can compare exact current prices, hotel ratings, and inclusions side by side before booking.',
  },
  {
    q: 'How do I know if an Umrah or Hajj agent in Kenya is licensed?',
    a: "In Kenya, a legitimate Umrah or Hajj agency should hold a Tourism Regulatory Authority (TRA) travel agency licence, a KRA tax compliance certificate, and — for international ticketing — IATA accreditation. UmrahMarket verifies these documents for every agent before they're marked 'Verified' on the platform, and publishes its own licence numbers on its Verified page so anyone can check them directly against the issuing authority.",
  },
  {
    q: 'What is included in a typical Umrah package from Nairobi?',
    a: 'A standard Umrah package from Nairobi usually includes round-trip flights, Saudi visa processing, hotel accommodation in Makkah and Madinah, and ground transport between cities. Higher-tier packages add closer-to-Haram hotels, guided ziyarat (historical site visits), and full-board meals. Exact inclusions vary by agent and package — always check the specific package listing.',
  },
  {
    q: 'When should I book Hajj or Umrah packages from Kenya?',
    a: 'Because Hajj visa quotas and flight seats are limited, booking several months ahead of Dhul Hijjah is strongly recommended for Hajj. Umrah can be performed any time of year, but Ramadan and school-holiday periods see the highest demand and prices in Kenya, so early booking still secures better rates.',
  },
  {
    q: 'Can I pay for Umrah or Hajj in installments in Kenya?',
    a: "Yes. UmrahMarket has its own Lipa Mdogo Mdogo savings plan — you save gradually on the platform until your balance covers a package, then book directly with a verified agent; any extra amount saved beyond the package price is refunded to you. It's a low-pressure way to plan for Umrah or Hajj without needing the full cost upfront.",
  },
  {
    q: 'Is UmrahMarket safe to book Umrah or Hajj packages with?',
    a: "UmrahMarket only lists agencies that have passed its verification process — checking licensing, tax compliance, and accreditation before an agent is marked 'Verified'. Payments are also followed up and confirmed against agency service delivery before the full amount is released to the agent, adding a layer of protection so your trip is carried out as booked.",
  },
  {
    q: 'What is the difference between Hajj and Umrah?',
    a: 'Hajj is a mandatory pilgrimage performed once a year during fixed dates in Dhul Hijjah, and is one of the Five Pillars of Islam for those who are able. Umrah is a shorter, non-mandatory pilgrimage that can be performed at any time of the year and involves fewer rituals.',
  },
];

const buildFaqJsonLd = (faqs) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
});

const FaqSection = ({ faqs = FAQS }) => (
  <section className="border-t border-gray-100 bg-gray-50/60">
    <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 max-w-3xl">
      <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">FAQ</p>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
        Umrah &amp; Hajj questions from Kenya, answered
      </h2>

      <div className="space-y-3">
        {faqs.map((f) => (
          <details key={f.q} className="group bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
            <summary className="flex items-center justify-between gap-3 cursor-pointer list-none font-semibold text-sm sm:text-base text-gray-900">
              {f.q}
              <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqJsonLd(faqs)) }}
      />
    </div>
  </section>
);

export default FaqSection;
export { FAQS };