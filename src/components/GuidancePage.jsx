// GuidancePage.jsx
// Standalone route: /guidance
// A step-by-step Hajj & Umrah guide with a video gallery, photo gallery,
// and quick tips — styled to match the UmraMarket emerald/gold identity
// used across Header.jsx, HeroSection.jsx, and Footer.jsx.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlayCircle, MapPin, Clock, CheckCircle2, BookOpen, Compass,
  ChevronRight, Sparkles, Sun, Moon, Droplets, ScrollText,
} from 'lucide-react';
import Header from './Header';
import Seo from './Seo';

const SITE_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'https://www.umrahmarket.net';

// ── Media: real photos of Makkah & Madinah ────────────────────────────────
const PLACEHOLDER_PHOTOS = [
  { id: 1, url: 'https://images.unsplash.com/photo-1513072064285-240f87fa81e8?auto=format&fit=crop&w=900&q=80', caption: 'The Kaaba, Masjid al-Haram, Makkah' },
  { id: 2, url: 'https://images.unsplash.com/photo-1565330770968-0240c0046ce3?auto=format&fit=crop&w=900&q=80', caption: 'Masjid al-Haram and the Zamzam Tower, Makkah' },
  { id: 3, url: 'https://images.unsplash.com/photo-1713302752681-0b14c1034707?auto=format&fit=crop&w=900&q=80', caption: 'Al Masjid al-Haram skyline, Makkah' },
  { id: 4, url: 'https://images.unsplash.com/photo-1692977579997-948328cdb7d2?auto=format&fit=crop&w=900&q=80', caption: 'Al-Masjid an-Nabawi, Madinah' },
  { id: 5, url: 'https://images.unsplash.com/photo-1724191078796-8a997b989f43?auto=format&fit=crop&w=900&q=80', caption: 'The Green Dome, the Prophet’s Mosque, Madinah' },
  { id: 6, url: 'https://images.unsplash.com/photo-1742465294457-3c405ef99c23?auto=format&fit=crop&w=900&q=80', caption: 'The Prophet’s Mosque at dusk, Madinah' },
];

const PLACEHOLDER_VIDEOS = [
  { id: 1, title: 'How to perform Tawaf, step by step', duration: '6:42', thumb: 'https://images.unsplash.com/photo-1513072064285-240f87fa81e8?auto=format&fit=crop&w=700&q=80' },
  { id: 2, title: 'Entering the state of Ihram correctly', duration: '4:15', thumb: 'https://images.unsplash.com/photo-1565330770968-0240c0046ce3?auto=format&fit=crop&w=700&q=80' },
  { id: 3, title: 'A day-by-day walkthrough of Hajj', duration: '11:08', thumb: 'https://images.unsplash.com/photo-1692977579997-948328cdb7d2?auto=format&fit=crop&w=700&q=80' },
  { id: 4, title: 'Sa’i: walking between Safa and Marwah', duration: '5:30', thumb: 'https://images.unsplash.com/photo-1713302752681-0b14c1034707?auto=format&fit=crop&w=700&q=80' },
];

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1513072064285-240f87fa81e8?auto=format&fit=crop&w=900&q=80';

// ── Step content ──────────────────────────────────────────────────────────
const UMRAH_STEPS = [
  { icon: Droplets, title: 'Enter Ihram', text: 'Perform ghusl (ritual bath), wear Ihram clothing, and make the intention (niyyah) for Umrah before crossing the Miqat boundary.' },
  { icon: Compass, title: 'Perform Tawaf', text: 'Circle the Kaaba seven times counter-clockwise, starting and ending at the Black Stone, reciting prayers as you go.' },
  { icon: Sun, title: 'Pray at Maqam Ibrahim', text: 'After Tawaf, offer two units of prayer near the Station of Ibrahim, then drink from the well of Zamzam.' },
  { icon: MapPin, title: "Walk Sa'i", text: 'Walk briskly seven times between the hills of Safa and Marwah, remembering Hajar’s search for water.' },
  { icon: ScrollText, title: 'Trim the hair', text: 'Men shave or trim their hair; women cut a small portion. This act marks the completion of Umrah.' },
];

const HAJJ_STEPS = [
  { icon: Droplets, title: 'Day 1 — Ihram & Mina', text: 'Enter Ihram, make the intention for Hajj, and travel to Mina, spending the day in worship.' },
  { icon: Sun, title: 'Day 2 — Arafat', text: 'Stand in prayer and reflection on the plains of Arafat from noon until sunset — the spiritual heart of Hajj.' },
  { icon: Moon, title: 'Day 2 night — Muzdalifah', text: 'Travel to Muzdalifah after sunset, combine Maghrib and Isha prayers, and gather pebbles for the next day.' },
  { icon: Compass, title: 'Day 3 — Mina & Jamarat', text: 'Stone the Jamarat pillars, offer the sacrifice, and trim or shave the hair before returning to Makkah for Tawaf al-Ifadah.' },
  { icon: MapPin, title: 'Days 4–6 — Tashreeq', text: 'Return to Mina for the days of Tashreeq, repeating the stoning ritual each day before a final Tawaf al-Wida (farewell circuit).' },
];

const TIPS = [
  { title: 'Book early', text: 'Verified agencies on UmraMarket fill up fast in peak months — secure your package well ahead of travel.' },
  { title: 'Pack light, pack right', text: 'Comfortable Ihram-compatible sandals and a small pouch for documents make the rituals far easier.' },
  { title: 'Stay hydrated', text: 'Makkah and Madinah can be intensely hot — carry water and rest in shaded areas between rituals.' },
  { title: 'Learn the duas', text: 'Memorising a few key supplications beforehand helps you stay present during each step.' },
];

// ── Small building blocks ─────────────────────────────────────────────────
const StepCard = ({ step, index }) => {
  const Icon = step.icon;
  return (
    <div className="relative flex gap-4 sm:gap-5 group">
      {/* Connector line */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform duration-300">
          <Icon className="h-5 w-5 sm:h-5.5 sm:w-5.5 text-white" />
        </div>
        <div className="w-px flex-1 bg-gradient-to-b from-emerald-200 to-transparent mt-2 last:hidden" />
      </div>
      <div className="pb-8 sm:pb-10 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Step {index + 1}</span>
        </div>
        <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-1">{step.title}</h4>
        <p className="text-sm text-gray-600 leading-relaxed">{step.text}</p>
      </div>
    </div>
  );
};

const VideoCard = ({ video, onPlay }) => (
  <button
    onClick={() => onPlay(video)}
    className="group relative rounded-2xl overflow-hidden bg-gray-900 aspect-video text-left shadow-sm hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
  >
    <img
      src={video.thumb}
      alt={video.title}
      className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-65 group-hover:scale-105 transition-all duration-500"
      loading="lazy"
      onError={e => { e.currentTarget.src = FALLBACK_IMG; }}
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/20" />
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 group-hover:bg-white transition-all duration-300 shadow-lg">
        <PlayCircle className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-600" fill="currentColor" />
      </div>
    </div>
    <span className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-semibold">{video.duration}</span>
    <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
      <p className="text-white text-xs sm:text-sm font-semibold leading-snug line-clamp-2">{video.title}</p>
    </div>
  </button>
);

const PhotoTile = ({ photo, className = '' }) => (
  <div className={`relative rounded-2xl overflow-hidden group ${className}`}>
    <img
      src={photo.url}
      alt={photo.caption}
      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
      loading="lazy"
      onError={e => { e.currentTarget.src = FALLBACK_IMG; }}
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <p className="absolute bottom-2.5 left-3 right-3 text-white text-[11px] sm:text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-1 group-hover:translate-y-0">
      {photo.caption}
    </p>
  </div>
);

// ── Main page ──────────────────────────────────────────────────────────────
const GuidancePage = ({ currentUser, onLogout, onAuthSuccess }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('umrah'); // 'umrah' | 'hajj'
  const [activeVideo, setActiveVideo] = useState(null);

  const steps = mode === 'umrah' ? UMRAH_STEPS : HAJJ_STEPS;

  return (
    <div className="bg-white pb-20 lg:pb-0">
      <Seo
        title="Umrah & Hajj Guidance | UmrahMarket Kenya"
        description="Step-by-step Umrah and Hajj guidance with practical tips for pilgrims in Kenya, including ritual order, preparation, and travel advice."
        canonical={`${SITE_ORIGIN}/guidance`}
      />
      <Header currentUser={currentUser} onLogout={onLogout} onAuthSuccess={onAuthSuccess} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-800">
        <div className="absolute inset-0 opacity-20">
          <img src={PLACEHOLDER_PHOTOS[0].url} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/70 via-emerald-900/80 to-emerald-900" />
        <div className="relative container mx-auto px-4 sm:px-6 py-14 sm:py-20 lg:py-24 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-emerald-100 text-xs font-semibold mb-5">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Step-by-step guidance
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-4">
            How to perform Hajj &amp; Umrah
          </h1>
          <p className="text-emerald-100/90 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            A clear, rite-by-rite walkthrough of every step — with videos and photos to help you prepare for one of the most meaningful journeys of your life.
          </p>
        </div>
      </section>

      {/* ── Mode toggle ── */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-xl border-b border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-center">
          <div className="inline-flex bg-gray-50 rounded-2xl p-1.5 border border-gray-200/60">
            {[
              { id: 'umrah', label: 'Umrah Guide' },
              { id: 'hajj', label: 'Hajj Guide' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setMode(t.id)}
                className={`px-5 sm:px-6 py-2 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                  mode === t.id
                    ? 'bg-white text-emerald-700 shadow-md shadow-emerald-100/50 border border-emerald-100/40'
                    : 'text-gray-500 hover:text-emerald-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Steps ── */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              {mode === 'umrah' ? 'Umrah — the rites in order' : 'Hajj — day by day'}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 sm:mb-10">
            {mode === 'umrah' ? 'Five steps to completing your Umrah' : 'Your Hajj journey, day by day'}
          </h2>
          <div>
            {steps.map((step, i) => (
              <StepCard key={step.title} step={step} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Video gallery ── */}
      <section className="bg-gray-50 py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <PlayCircle className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Watch &amp; learn</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Guided video walkthroughs</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {PLACEHOLDER_VIDEOS.map(v => (
              <VideoCard key={v.id} video={v} onPlay={setActiveVideo} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Photo gallery ── */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 mb-1.5">
            <Compass className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Scenes from the journey</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Photo gallery</h2>

          {/* Responsive mosaic: 2 cols mobile, 3 cols tablet+, with a tall hero tile */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 auto-rows-[140px] sm:auto-rows-[180px] lg:auto-rows-[200px]">
            <PhotoTile photo={PLACEHOLDER_PHOTOS[0]} className="col-span-2 row-span-2" />
            <PhotoTile photo={PLACEHOLDER_PHOTOS[1]} />
            <PhotoTile photo={PLACEHOLDER_PHOTOS[2]} />
            <PhotoTile photo={PLACEHOLDER_PHOTOS[3]} className="col-span-2 sm:col-span-1" />
            <PhotoTile photo={PLACEHOLDER_PHOTOS[4]} />
            <PhotoTile photo={PLACEHOLDER_PHOTOS[5]} />
          </div>
        </div>
      </section>

      {/* ── Quick tips ── */}
      <section className="bg-emerald-50/60 py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 mb-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Before you go</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">A few practical tips</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {TIPS.map(tip => (
              <div key={tip.title} className="bg-white rounded-2xl p-5 border border-emerald-100/70 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                </div>
                <h4 className="font-bold text-gray-900 text-sm mb-1.5">{tip.title}</h4>
                <p className="text-xs text-gray-600 leading-relaxed">{tip.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 to-teal-700 px-6 sm:px-10 py-10 sm:py-12 text-center">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-300/10" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-white/5" />
            <h3 className="relative text-xl sm:text-2xl font-bold text-white mb-2">Ready to plan your journey?</h3>
            <p className="relative text-emerald-100/90 text-sm mb-6 max-w-xl mx-auto">
              Browse verified Hajj and Umrah packages from trusted agencies on UmraMarket.
            </p>
            <button
              onClick={() => navigate('/')}
              className="relative inline-flex items-center gap-2 px-6 py-3 bg-white text-emerald-700 font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              Browse packages <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Video modal (dummy player) ── */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setActiveVideo(null)}
        >
          <div className="w-full max-w-3xl" onClick={e => e.stopPropagation()}>
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
              <img
                src={activeVideo.thumb}
                alt={activeVideo.title}
                className="absolute inset-0 w-full h-full object-cover opacity-50"
                onError={e => { e.currentTarget.src = FALLBACK_IMG; }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
                <PlayCircle className="h-14 w-14 opacity-90" />
                <p className="text-sm text-white/70 px-6 text-center">Demo placeholder — connect a real video source to play "{activeVideo.title}"</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-white text-sm font-medium">{activeVideo.title}</p>
              <button
                onClick={() => setActiveVideo(null)}
                className="text-white/70 hover:text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuidancePage;