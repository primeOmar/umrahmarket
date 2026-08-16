// BlogPostPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Calendar, Eye, AlertCircle, RefreshCw, Tag, FileText, Download } from 'lucide-react';
import { request } from '../api';
import Seo from './Seo';

const SITE_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'https://www.umrahmarket.net';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '';

// initialPost comes from Vike's pages/+data.js server-side loader — only
// populated when this is the very first render of '/blog/:slug' coming
// straight from the server (same convention initialAgent already uses).
// Client-side navigation between posts leaves it null, so behavior there
// is 100% unchanged from before.
const BlogPostPage = ({ initialPost = null }) => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(initialPost);
  const [loading, setLoading] = useState(!initialPost);
  const [error, setError] = useState(null);

  const fetchPost = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await request({ method: 'get', url: `/blog/${slug}` });
      const data = res.data?.data || res.data;
      setPost(data);
    } catch (err) {
      setError(err.message || 'Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Skip the initial fetch when SSR already seeded this exact post — but
    // if the slug in the URL doesn't match (client-side nav between posts
    // reusing this mounted route), fetch as normal.
    if (initialPost && initialPost.slug === slug) return;
    fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 animate-pulse">
        <div className="container mx-auto px-4 sm:px-6 py-8 max-w-3xl">
          <div className="h-6 bg-gray-200 rounded w-32 mb-6" />
          <div className="h-64 bg-gray-200 rounded-2xl mb-6" />
          <div className="h-6 bg-gray-200 rounded w-4/5 mb-3" />
          <div className="h-3 bg-gray-200 rounded w-1/3 mb-8" />
          <div className="h-3 bg-gray-200 rounded w-full mb-2" />
          <div className="h-3 bg-gray-200 rounded w-full mb-2" />
          <div className="h-3 bg-gray-200 rounded w-4/5" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-10 max-w-sm w-full">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-red-700 mb-1">Failed to load post</p>
          <p className="text-xs text-red-500 mb-4">{error || 'Post not found'}</p>
          <button
            onClick={fetchPost}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />Retry
          </button>
        </div>
      </div>
    );
  }

  const canonical = `${SITE_ORIGIN}/blog/${post.slug}`;

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Seo
        title={post.meta_title || `${post.title} | UmrahMarket Blog`}
        description={post.meta_description || post.excerpt}
        canonical={canonical}
        image={post.cover_image_url}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.meta_description || post.excerpt,
          image: post.cover_image_url ? [post.cover_image_url] : undefined,
          datePublished: post.published_at,
          dateModified: post.updated_at || post.published_at,
          author: { '@type': 'Person', name: post.author_name || 'UmrahMarket Team' },
        }}
      />

      <div className="container mx-auto px-4 sm:px-6 pt-6">
        <button
          onClick={() => navigate('/blog')}
          className="cursor-pointer inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-emerald-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />Back to Blog
        </button>
      </div>

      <article className="container mx-auto px-4 sm:px-6 mt-4 max-w-3xl">
        {post.cover_video_url ? (
          <video src={post.cover_video_url} controls poster={post.cover_image_url} className="w-full h-56 sm:h-72 object-cover rounded-2xl bg-black mb-6" />
        ) : post.cover_image_url ? (
          <img src={post.cover_image_url} alt={post.title} className="w-full h-56 sm:h-72 object-cover rounded-2xl mb-6" />
        ) : null}

        <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">{post.category}</span>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2 mb-3 leading-tight">{post.title}</h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 pb-6 mb-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {post.author_avatar_url ? (
              <img src={post.author_avatar_url} alt={post.author_name} className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white text-xs font-bold">
                {(post.author_name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-medium text-gray-700">{post.author_name || 'UmrahMarket Team'}</span>
          </div>
          <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{formatDate(post.published_at)}</span>
          <span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" />{post.view_count ?? 0} views</span>
        </div>

        <div className="prose prose-emerald max-w-none prose-headings:font-bold prose-a:text-emerald-600">
          <ReactMarkdown>{post.content || ''}</ReactMarkdown>
        </div>

        {Array.isArray(post.tags) && post.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-8 pt-6 border-t border-gray-100">
            <Tag className="h-3.5 w-3.5 text-gray-400" />
            {post.tags.map((t) => (
              <span key={t} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-100">
                {t}
              </span>
            ))}
          </div>
        )}

        {post.attachment_url && (
          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-red-50 rounded-xl flex-shrink-0">
                  <FileText className="h-6 w-6 text-red-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {post.attachment_name || 'Read the full document'}
                  </p>
                  <p className="text-xs text-gray-500">PDF</p>
                </div>
              </div>
              <a
                href={post.attachment_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors flex-shrink-0"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Open PDF</span>
              </a>
            </div>
          </div>
        )}
      </article>

      {Array.isArray(post.related) && post.related.length > 0 && (
        <div className="container mx-auto px-4 sm:px-6 mt-10 max-w-3xl">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Related posts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {post.related.map((r) => (
              <div
                key={r.id}
                onClick={() => navigate(`/blog/${r.slug}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/blog/${r.slug}`); } }}
                className="group cursor-pointer bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all"
              >
                {r.cover_image_url && (
                  <div className="h-28 overflow-hidden bg-gray-100">
                    <img src={r.cover_image_url} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  </div>
                )}
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-emerald-700 transition-colors">{r.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogPostPage;