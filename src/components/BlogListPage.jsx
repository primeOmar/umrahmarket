// BlogListPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Newspaper, AlertCircle, RefreshCw, Calendar, Eye } from 'lucide-react';
import { request } from '../api';
import Seo from './Seo';

const SITE_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'https://www.umrahmarket.net';

const CATEGORIES = ['All', 'News', 'Guides', 'Umrah Tips', 'Hajj Tips', 'Agent Spotlights'];

const fallbackImage =
  'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=800&q=80';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';

const PostCard = ({ post, onClick }) => {
  const [imgError, setImgError] = useState(false);
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className="group cursor-pointer bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50 transition-all duration-300"
    >
      <div className="h-44 overflow-hidden bg-gray-100">
        <img
          src={imgError ? fallbackImage : (post.cover_image_url || fallbackImage)}
          alt={post.title}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </div>
      <div className="p-5">
        <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide">{post.category}</span>
        <h3 className="font-semibold text-gray-900 text-base mt-1.5 mb-1.5 line-clamp-2 group-hover:text-emerald-700 transition-colors">
          {post.title}
        </h3>
        {post.excerpt && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{post.excerpt}</p>}
        <div className="flex items-center gap-3 text-xs text-gray-400 pt-3 border-t border-gray-50">
          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(post.published_at)}</span>
          <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{post.view_count ?? 0}</span>
        </div>
      </div>
    </div>
  );
};

// initialPosts comes from Vike's pages/+data.js server-side loader — only
// populated when this is the very first render of '/blog' coming straight
// from the server (same convention initialAgents already uses). Every
// client-side navigation into this page leaves it null, so behavior there
// is 100% unchanged from before.
const BlogListPage = ({ initialPosts = null }) => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState(initialPosts || []);
  const [loading, setLoading] = useState(!initialPosts);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('All');

  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await request({ method: 'get', url: '/blog' });
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setPosts(list);
    } catch (err) {
      setError(err.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Skip the initial fetch when Vike's SSR loader already seeded posts —
    // same reasoning App.jsx uses for initialPackages/initialAgents.
    if (!initialPosts) fetchPosts();
  }, []);

  const filtered = category === 'All' ? posts : posts.filter((p) => p.category === category);

  return (
    <div className="min-h-screen bg-gray-50">
      <Seo
        title="Umrah & Hajj News, Guides and Tips | UmrahMarket Blog"
        description="News, updates, guides, and practical tips for Umrah and Hajj pilgrims travelling from Kenya."
        canonical={`${SITE_ORIGIN}/blog`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'UmrahMarket Blog',
          description: 'News, updates, guides, and practical tips for Umrah and Hajj pilgrims travelling from Kenya.',
          url: `${SITE_ORIGIN}/blog`,
        }}
      />

      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center gap-2 mb-1">
            <Newspaper className="h-5 w-5 text-emerald-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Blog</h1>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            News, guides, and tips for Umrah &amp; Hajj pilgrims from Kenya.
          </p>

          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  category === c
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl overflow-hidden border border-gray-100">
                <div className="h-44 bg-gray-200" />
                <div className="p-5">
                  <div className="h-3 bg-gray-200 rounded w-1/4 mb-3" />
                  <div className="h-4 bg-gray-200 rounded w-4/5 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-3/5" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-10 max-w-sm w-full">
              <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-red-700 mb-1">Failed to load posts</p>
              <p className="text-xs text-red-500 mb-4">{error}</p>
              <button
                onClick={fetchPosts}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />Retry
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Newspaper className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No posts in this category yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((post) => (
              <PostCard key={post.id} post={post} onClick={() => navigate(`/blog/${post.slug}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogListPage;