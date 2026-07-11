// AgentDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Shield, ShieldCheck, AlertCircle, RefreshCw,
  Package, Star, Calendar,
} from 'lucide-react';
import { request } from '../api';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/agents/:id           →  agent profile
// GET /api/agents/:id/packages  →  packages posted by this agent
// If the backend already embeds `packages` on the agent object, the second
// call below is skipped automatically. Adjust paths to match the actual
// backend routes if these differ.
// ─────────────────────────────────────────────────────────────────────────────

const AgentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [agent, setAgent] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAgent = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await request({ method: 'get', url: `/agents/${id}` });
      const data = res.data?.agent || res.data;
      setAgent(data);

      if (Array.isArray(data?.packages)) {
        setPackages(data.packages);
      } else {
        const pkgRes = await request({ method: 'get', url: `/agents/${id}/packages` });
        setPackages(Array.isArray(pkgRes.data) ? pkgRes.data : (pkgRes.data?.packages || []));
      }
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

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Back */}
      <div className="container mx-auto px-4 sm:px-6 pt-6">
        <button
          onClick={() => navigate('/agents')}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-emerald-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />Back to Agents
        </button>
      </div>

      {/* Agent profile card */}
      <div className="container mx-auto px-4 sm:px-6 mt-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white text-2xl font-bold shadow-sm overflow-hidden flex-shrink-0">
              {agent.avatar
                ? <img src={agent.avatar} alt={name} className="w-full h-full object-cover" />
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
                {agent.memberSince && (
                  <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Since {agent.memberSince}</span>
                )}
              </div>
            </div>
          </div>

          {agent.bio && (
            <p className="text-sm text-gray-600 mt-4 pt-4 border-t border-gray-50">{agent.bio}</p>
          )}
        </div>
      </div>

      {/* Packages */}
      <div className="container mx-auto px-4 sm:px-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-4 w-4 text-emerald-600" />
          <h2 className="text-base font-semibold text-gray-900">
            Packages ({packages.length})
          </h2>
        </div>

        {packages.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
            <p className="text-sm text-gray-500">This agent hasn't posted any packages yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => navigate(`/package/${pkg.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/package/${pkg.id}`); } }}
                className="group cursor-pointer"
              >
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-2 bg-gray-100">
                  <img
                    src={pkg.image}
                    alt={pkg.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?auto=format&fit=crop&w=800&q=80'; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                  <div className="absolute bottom-2 left-2">
                    <span className="text-sm font-bold text-white">${pkg.price}</span>
                  </div>
                </div>
                <h3 className="font-medium text-gray-900 text-xs sm:text-sm line-clamp-1 group-hover:text-emerald-700 transition-colors">
                  {pkg.title}
                </h3>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentDetailPage;