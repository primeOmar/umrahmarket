// AgentsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, MapPin, Search, AlertCircle, RefreshCw, Users, ShieldCheck, Loader2, Star, Quote,
} from 'lucide-react';
import { request } from '../api';
import Seo from './Seo';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/agents  →  [{ id, businessName, firstName, lastName, avatar,
//                        location, city, country, verificationStatus,
//                        packageCount, rating }]
// Adjust the endpoint path / field names below to match agent_documents_routes.js
// or wherever the agents list is actually served from.
// ─────────────────────────────────────────────────────────────────────────────

const VerificationBadge = ({ status }) => {
  const isVerified = status === 'verified' || status === 'approved';
  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
        isVerified
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
          : 'bg-gray-100 text-gray-500 border border-gray-200'
      }`}
    >
      {isVerified ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
      {isVerified ? 'Verified' : 'Pending'}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reviews  →  [{ id, agentId, agentName, reviewerName, rating,
//                         comment, createdAt }]
// Adjust the endpoint path / field names below to match reviews_routes.js
// or wherever the reviews list is actually served from.
// ─────────────────────────────────────────────────────────────────────────────

const Stars = ({ rating }) => (
  <div className="flex gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
      />
    ))}
  </div>
);

const ReviewCard = ({ review }) => {
  const name = review.reviewerName || review.userName || 'Anonymous pilgrim';
  const agentName = review.agentName || review.agent?.businessName;
  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
    : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <Stars rating={review.rating || 0} />
        <Quote className="h-4 w-4 text-emerald-200 flex-shrink-0" />
      </div>
      <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">{review.comment}</p>
      <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-900 truncate">{name}</p>
          {agentName && (
            <p className="text-[11px] text-gray-400 truncate">for {agentName}</p>
          )}
        </div>
        {date && <span className="text-[11px] text-gray-400 flex-shrink-0 ml-3">{date}</span>}
      </div>
    </div>
  );
};

const AgentsPage = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState(null);

  const fetchAgents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await request({ method: 'get', url: '/agents' });
      const list = Array.isArray(res.data) ? res.data : (res.data?.agents || []);
      const verifiedOnly = list.filter(
        (a) => a.verificationStatus === 'verified' || a.verificationStatus === 'approved'
      );
      setAgents(verifiedOnly);
    } catch (err) {
      setError(err.message || 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      const res = await request({ method: 'get', url: '/reviews', params: { limit: 8 } });
      const list = Array.isArray(res.data) ? res.data : (res.data?.reviews || []);
      setReviews(list);
    } catch (err) {
      setReviewsError(err.message || 'Failed to load reviews');
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => { fetchAgents(); fetchReviews(); }, []);

  const filtered = agents.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = (a.businessName || `${a.firstName || ''} ${a.lastName || ''}`).toLowerCase();
    return name.includes(q);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Seo
        title="Verified Travel Agents for Umrah Packages in Kenya | UmrahMarket"
        description="Browse verified travel agents listing Umrah and Hajj packages in Kenya. Compare packages, ratings, and office locations before you book."
        canonical={`${window.location.origin}/agents`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Verified Travel Agents for Umrah Packages in Kenya',
          description: 'Browse verified travel agents listing Umrah and Hajj packages in Kenya.',
          url: `${window.location.origin}/agents`,
        }}
      />
      {/* Page header */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-5 w-5 text-emerald-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Travel Agents</h1>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Browse verified Hajj &amp; Umrah agents and their packages.
          </p>

          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by agent name..."
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all duration-300"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl p-4 border border-gray-100">
                <div className="h-12 w-12 rounded-full bg-gray-200 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-3/5 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-2/5" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-10 max-w-sm w-full">
              <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-red-700 mb-1">Failed to load agents</p>
              <p className="text-xs text-red-500 mb-4">{error}</p>
              <button
                onClick={fetchAgents}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />Retry
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {search ? 'No agents match your search.' : 'No agents found yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((agent) => {
              const name = agent.businessName || `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || 'Unnamed Agent';
              return (
                <div
                  key={agent.id}
                  onClick={() => navigate(`/agents/${agent.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/agents/${agent.id}`); } }}
                  className="group cursor-pointer bg-white rounded-2xl p-4 border border-gray-100 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white text-base font-bold shadow-sm overflow-hidden">
                      {agent.logoUrl
                        ? <img src={agent.logoUrl} alt={name} className="w-full h-full object-cover" />
                        : name.charAt(0).toUpperCase()}
                    </div>
                    <VerificationBadge status={agent.verificationStatus} />
                  </div>

                  <h3 className="font-semibold text-gray-900 text-sm group-hover:text-emerald-700 transition-colors line-clamp-1">
                    {name}
                  </h3>

                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                    {agent.officeMapsUrl ? (
                      <a
                        href={agent.officeMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 hover:text-emerald-600 hover:underline"
                      >
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        Office location
                      </a>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-400">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        Location not set
                      </span>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500">
                    <span>{agent.packageCount ?? 0} package{(agent.packageCount ?? 0) === 1 ? '' : 's'}</span>
                    {typeof agent.yearsExperience === 'number' && agent.yearsExperience > 0 && (
                      <span>{agent.yearsExperience} yr{agent.yearsExperience === 1 ? '' : 's'} exp.</span>
                    )}
                    {agent.rating > 0 && (
                      <span className="font-medium text-gray-700">{agent.rating}★</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reviews */}
      <div className="bg-white border-t border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-24 sm:pb-10">
          <div className="flex items-center gap-2 mb-1">
            <Star className="h-5 w-5 text-emerald-600" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">What Pilgrims Say</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Real reviews left by pilgrims after travelling with our verified agents.
          </p>

          {reviewsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <div className="h-3 bg-gray-200 rounded w-2/5 mb-4" />
                  <div className="h-3 bg-gray-200 rounded w-full mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-4/5 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-3/5" />
                </div>
              ))}
            </div>
          ) : reviewsError ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-sm w-full">
                <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-red-700 mb-1">Failed to load reviews</p>
                <p className="text-xs text-red-500 mb-4">{reviewsError}</p>
                <button
                  onClick={fetchReviews}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />Retry
                </button>
              </div>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-14">
              <Star className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No reviews yet — be the first to share your experience.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentsPage;