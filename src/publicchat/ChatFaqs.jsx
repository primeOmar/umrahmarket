import React from 'react';
import { HelpCircle } from 'lucide-react';

/**
 * ChatFaqs — FAQ knowledge base + matcher + quick-question chips
 * for the Umrah Market ChatWidget.
 *
 * Exports:
 *   FAQS              -> the dummy knowledge base (edit freely / later load from backend)
 *   findFaqAnswer()   -> keyword-scoring matcher; returns the best FAQ or null
 *   FaqSuggestions    -> (default) tappable chips shown at the start of a chat
 *
 * Matching strategy (simple, dependency-free — NOT machine learning):
 *   - Normalize the visitor's text (lowercase, strip punctuation, naive
 *     singularization so "visas" hits the "visa" keyword and vice versa).
 *   - Each FAQ has three tiers of signals:
 *       strongKeywords -> 2pts each. Distinctive words that are unambiguous
 *                         on their own ("visa", "ziyarah", "mpesa", "refund").
 *                         ONE of these is enough to answer.
 *       keywords       -> 1pt each. Generic words ("pay", "need", "long")
 *                         that only count when reinforced by other hits.
 *       phrases        -> 3pts each. Multi-word, most specific of all.
 *   - Score = sum of hits. Best FAQ wins if score >= MIN_SCORE (2),
 *     otherwise null (caller escalates to a human agent).
 *
 *   This fixes questions like "Do you have visa?" — previously "visa" alone
 *   scored 1 < MIN_SCORE and wrongly escalated. As a strong keyword it now
 *   scores 2 and answers instantly, while generic words like "pay" still
 *   need a second signal so we don't misfire on vague messages.
 */

const MIN_SCORE = 2;

export const FAQS = [
  {
    id: 'faq-packages',
    question: 'What Umrah packages do you offer?',
    strongKeywords: ['package', 'packages'],
    keywords: ['offer', 'options', 'deals', 'trip', 'trips'],
    phrases: ['what packages', 'umrah packages', 'available packages'],
    answer:
      'We offer three main Umrah packages:\n\n• Economy — shared rooms, hotels within 800m of the Haram, from USD 1,150.\n• Standard — 4-star hotels within 400m, from USD 1,650.\n• Premium — 5-star hotels facing the Haram, private transport, from USD 2,400.\n\nAll packages include visa processing, return flights from Nairobi/Mombasa, and guided ziyarah. Would you like details on a specific package?',
  },
  {
    id: 'faq-pricing',
    question: 'How much does an Umrah package cost?',
    strongKeywords: ['price', 'prices', 'pricing', 'cost', 'costs'],
    keywords: ['much', 'pay', 'cheap', 'expensive', 'budget'],
    phrases: ['how much', 'price list', 'package cost'],
    answer:
      'Package prices start from USD 1,150 (Economy), USD 1,650 (Standard) and USD 2,400 (Premium) per person sharing. Prices vary with travel dates — Ramadhan and school-holiday departures cost more. Tell us your preferred travel month and an agent can send you an exact quote.',
  },
  {
    id: 'faq-visa',
    question: 'Do you process the Umrah visa for me?',
    strongKeywords: ['visa', 'visas', 'evisa', 'nusuk'],
    keywords: ['permit', 'process', 'processing'],
    phrases: ['umrah visa', 'visa processing', 'visa requirements'],
    answer:
      'Yes — Umrah visa processing is included in every package. We handle the full application through the official Nusuk platform. You only need to share a passport copy (valid at least 6 months from travel date) and a passport-size photo. Processing typically takes 3–7 working days.',
  },
  {
    id: 'faq-documents',
    question: 'What documents do I need to travel?',
    strongKeywords: ['documents', 'document', 'passport', 'vaccination', 'vaccine', 'yellowfever'],
    keywords: ['requirements', 'need', 'papers', 'photo'],
    phrases: ['what documents', 'documents required', 'travel requirements', 'yellow fever'],
    answer:
      'You will need:\n\n1. A passport valid for at least 6 months from your travel date.\n2. One passport-size photo (white background).\n3. A yellow fever vaccination certificate.\n4. Proof of any required health vaccinations (e.g. meningitis ACWY).\n\nWe handle the visa and all Saudi-side paperwork once you share these.',
  },
  {
    id: 'faq-payment',
    question: 'How do I pay? Can I pay in instalments?',
    strongKeywords: ['mpesa', 'instalment', 'instalments', 'installment', 'installments', 'deposit'],
    keywords: ['pay', 'payment', 'lipa'],
    phrases: ['payment plan', 'pay in instalments', 'lipa mdogo mdogo', 'how do i pay', 'how can i pay'],
    answer:
      'We accept M-Pesa, bank transfer, and card payments. You can also pay in instalments: secure your booking with a 30% deposit, then clear the balance up to 3 weeks before departure. An agent can set up a personalised payment plan for you.',
  },
  {
    id: 'faq-flights-hotels',
    question: 'Which airlines and hotels do you use?',
    strongKeywords: ['flight', 'flights', 'airline', 'airlines', 'hotel', 'hotels', 'accommodation'],
    keywords: ['room', 'rooms', 'stay'],
    phrases: ['which airline', 'which hotels', 'where do we stay'],
    answer:
      'We fly with reputable carriers such as Saudia, Kenya Airways, and Qatar Airways depending on the departure date. Hotels range from clean 3-star properties within walking distance of the Haram (Economy) to 5-star Haram-view hotels (Premium). Exact hotel names are confirmed on your booking sheet.',
  },
  {
    id: 'faq-duration',
    question: 'How long is the Umrah trip?',
    strongKeywords: ['duration', 'itinerary'],
    keywords: ['long', 'days', 'weeks', 'schedule', 'nights'],
    phrases: ['how long', 'how many days', 'how many nights', 'trip duration'],
    answer:
      'Our standard packages run 10, 14, or 21 days, typically split between Makkah and Madinah (e.g. 7 nights Makkah + 5 nights Madinah on the 14-day package). Custom durations are available for private groups.',
  },
  {
    id: 'faq-group',
    question: 'Do you offer group or family bookings?',
    strongKeywords: ['group', 'groups', 'family', 'families'],
    keywords: ['children', 'kids', 'discount', 'together'],
    phrases: ['group booking', 'family package', 'group discount'],
    answer:
      'Yes! Families and groups of 10+ travellers get discounted rates and can request rooms close together. Children under 12 travel at reduced rates, and infants under 2 pay only taxes and visa fees. Share your group size and an agent will prepare a group quote.',
  },
  {
    id: 'faq-cancellation',
    question: 'What is your cancellation and refund policy?',
    strongKeywords: ['cancel', 'cancellation', 'refund', 'refunds', 'reschedule', 'postpone'],
    keywords: ['change', 'policy'],
    phrases: ['cancellation policy', 'refund policy', 'can i cancel'],
    answer:
      'You may cancel free of charge within 48 hours of booking. After that: cancellations 30+ days before departure receive a refund minus visa and ticketing costs; within 30 days, refunds depend on airline and hotel terms. Rescheduling to a later date is usually cheaper than cancelling — an agent can walk you through options.',
  },
  {
    id: 'faq-ziyarah',
    question: 'Is guided ziyarah included?',
    strongKeywords: ['ziyarah', 'ziyara'],
    keywords: ['guide', 'guided', 'tour', 'tours', 'sites', 'historical'],
    phrases: ['guided ziyarah', 'ziyarah included', 'historical sites'],
    answer:
      'Yes, all packages include guided ziyarah in both Makkah and Madinah — including Jabal al-Nour, Jabal Thawr, Masjid Quba, and Uhud — led by an experienced Swahili/English-speaking guide.',
  },
];

/** Normalize free text for matching. */
const normalize = (text) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Naive singular form: "visas" -> "visa", "families" -> "family".
 * Cheap stemming so plural/singular mismatches between the visitor's
 * wording and the keyword lists still connect.
 */
const singular = (word) => {
  if (word.length > 3 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 2 && word.endsWith('s')) return word.slice(0, -1);
  return word;
};

/**
 * Find the best-matching FAQ for a visitor's question.
 * @param {string} text - the visitor's raw message
 * @returns {{ faq: object, score: number } | null}
 */
export const findFaqAnswer = (text) => {
  const cleaned = normalize(text || '');
  if (!cleaned) return null;

  // Index both the exact words and their singular forms, so
  // "visas" matches the keyword "visa" and "visa" matches "visas".
  const words = new Set();
  cleaned.split(' ').forEach((w) => {
    words.add(w);
    words.add(singular(w));
  });

  const hits = (list, weight) => {
    let s = 0;
    for (const kw of list || []) {
      if (words.has(kw) || words.has(singular(kw))) s += weight;
    }
    return s;
  };

  let best = null;
  let bestScore = 0;

  for (const faq of FAQS) {
    let score = 0;

    score += hits(faq.strongKeywords, 2); // distinctive — one is enough
    score += hits(faq.keywords, 1); // generic — needs reinforcement

    for (const phrase of faq.phrases || []) {
      if (cleaned.includes(phrase)) score += 3;
    }

    if (score > bestScore) {
      bestScore = score;
      best = faq;
    }
  }

  return bestScore >= MIN_SCORE ? { faq: best, score: bestScore } : null;
};

/**
 * FaqSuggestions — tappable quick-question chips shown at the start
 * of a conversation. Tapping a chip sends that FAQ question as if the
 * visitor typed it.
 *
 * Props:
 *   onSelect(questionText: string) — required
 *   limit — how many chips to show (default 4)
 */
const FaqSuggestions = ({ onSelect, limit = 4 }) => {
  const suggestions = FAQS.slice(0, limit);

  return (
    <div className="mb-3">
      <p className="text-[11px] font-medium text-gray-400 flex items-center gap-1 mb-2">
        <HelpCircle className="h-3 w-3" />
        Common questions
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((faq) => (
          <button
            key={faq.id}
            type="button"
            onClick={() => onSelect(faq.question)}
            className="text-xs text-green-800 bg-green-50 border border-green-200 rounded-full px-3 py-1.5 hover:bg-green-100 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
          >
            {faq.question}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FaqSuggestions;