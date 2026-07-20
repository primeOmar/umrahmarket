// AgentDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Shield, ShieldCheck, AlertCircle, RefreshCw,
  Star, Calendar, Briefcase, Globe, Tag, Building2,
} from 'lucide-react';
import { request } from '../api';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/agents/:id  →  full public agent profile (see agents.routes.js):
// businessName, firstName, lastName, verificationStatus, agentNumber,
// officeMapsUrl, bio, logoUrl, yearsExperience, specialties, websiteUrl,
// memberSince. This page shows agent details only — no package listings.
//
// "Since" year is DERIVED on the client: currentYear − yearsExperience.
// The backend memberSince field is intentionally NOT consumed here.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive the year the agent started working from yearsExperience:
 *   startYear = current year − yearsExperience
 * e.g. in 2026, an agent with 7 years of experience → Since 2019.
 * Returns null when yearsExperience is missing or not a positive number.
 */
const getStartYear = (yearsExperience) => {
  if (typeof yearsExperience !== 'number' || yearsExperience <= 0) return null;
  return new Date().getFullYear() - Math.floor(yearsExperience);
};

const AgentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAgent = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await request({ method: 'get', url: `/agents/${id}` });
      const data = res.data?.agent || res.data;
      setAgent(data);
    } catch (err) {
      setError(err.message || 'Failed to load agent');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAgent(); }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 animate-pulse">
        <div className="container mx-auto px-4 sm:px-6 py-8">
          <div className="h-6 bg-gray-200 rounded w-32 mb-6" />
          <div className="h-24 w-24 rounded-full bg-gray-200 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/5" />
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-10 max-w-sm w-full">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-red-700 mb-1">Failed to load agent</p>
          <p className="text-xs text-red-500 mb-4">{error || 'Agent not found'}</p>
          <button
            onClick={fetchAgent}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />Retry
          </button>
        </div>
      </div>
    );
  }

  const name = agent.businessName || `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || 'Unnamed Agent';
  const isVerified = agent.verificationStatus === 'verified' || agent.verificationStatus === 'approved';

  // Derived start year — computed from yearsExperience, NOT from backend memberSince
  const startYear = getStartYear(agent.yearsExperience);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Back */}
      <div className=" container mx-auto px-4 sm:px-6 pt-6">
        <button
          onClick={() => navigate('/agents')}
          className="cursor-pointer inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-emerald-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />Back to Agents
        </button>
      </div>

      {/* Agent profile card */}
      <div className="container mx-auto px-4 sm:px-6 mt-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white text-2xl font-bold shadow-sm overflow-hidden flex-shrink-0">
              {agent.logoUrl
                ? <img src={agent.logoUrl} alt={name} className="w-full h-full object-cover" />
                : name.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">{name}</h1>
                <div
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    isVerified
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-gray-100 text-gray-500 border border-gray-200'
                  }`}
                >
                  {isVerified ? <ShieldCheck className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                  {isVerified ? 'Verified Agent' : 'Verification Pending'}
                </div>
              </div>

              <div className="flex items-center gap-1 mt-1.5 text-sm text-gray-500">
                {agent.officeMapsUrl ? (
                  <a
                    href={agent.officeMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-emerald-600 hover:underline"
                  >
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    View office location
                  </a>
                ) : (
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    Office location not set
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                {agent.agentNumber && (
                  <span className="flex items-center gap-1.5 font-mono text-xs bg-gray-50 px-2 py-1 rounded-md border border-gray-100">{agent.agentNumber}</span>
                )}
                {agent.rating > 0 && (
                  <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-amber-400 fill-current" />{agent.rating}</span>
                )}
                {typeof agent.yearsExperience === 'number' && agent.yearsExperience > 0 && (
                  <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" />{agent.yearsExperience} year{agent.yearsExperience === 1 ? '' : 's'} experience</span>
                )}
                {startYear && (
                  <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Since {startYear}</span>
                )}
                {agent.websiteUrl && (
                  <a
                    href={agent.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-emerald-600 hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" />Website
                  </a>
                )}
              </div>
            </div>
          </div>

          {agent.bio && (
            <p className="text-sm text-gray-600 mt-4 pt-4 border-t border-gray-50 whitespace-pre-line">{agent.bio}</p>
          )}

          {Array.isArray(agent.specialties) && agent.specialties.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-50">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-2">
                <Tag className="h-3.5 w-3.5" />Specialties
              </div>
              <div className="flex flex-wrap gap-2">
                {agent.specialties.map((s) => (
                  <span key={s} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-100">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Office photos */}
      {Array.isArray(agent.officePhotos) && agent.officePhotos.length > 0 && (
        <div className="container mx-auto px-4 sm:px-6 mt-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-3">
              <Building2 className="h-4 w-4 text-emerald-600" />Office
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {agent.officePhotos.map((url, i) => (
                <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-100">
                  <img
                    src={url}
                    alt={`${name} office ${i + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentDetailPage;