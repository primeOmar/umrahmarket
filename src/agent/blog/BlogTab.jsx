import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Edit, Trash2, Search, Loader2, RefreshCw, AlertCircle,
  Newspaper, Image as ImageIcon, Video, Upload, X, Eye,
  Calendar, ExternalLink, Tag as TagIcon, CheckCircle2, FileEdit,
  FileText,
} from 'lucide-react';
import {
  getBlogPosts, getBlogPost, createBlogPost, updateBlogPost,
  deleteBlogPost, uploadBlogMedia, uploadBlogAttachment,
} from '../services/blogApi';

const CATEGORIES = ['News', 'Guides', 'Umrah Tips', 'Hajj Tips', 'Agent Spotlights'];
const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_SITE_URL || 'https://umrahmarket.net';

const fallbackImage =
  'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=800&q=80';

const statusColor = (status) =>
  status === 'published' ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-white';

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

// ─────────────────────────────────────────────────────────────────────────────
// BlogPostCard
// ─────────────────────────────────────────────────────────────────────────────
const BlogPostCard = ({ post, onEdit, onDelete }) => {
  const [imgError, setImgError] = useState(false);
  const imageSrc = imgError ? fallbackImage : (post.cover_image_url || fallbackImage);

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 border border-gray-100 group">
      <div className="relative h-44 overflow-hidden">
        <img
          src={imageSrc}
          alt={post.title}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
        {post.cover_video_url && (
          <span className="absolute top-4 right-4 p-1.5 bg-black/40 backdrop-blur-sm rounded-lg">
            <Video className="h-3.5 w-3.5 text-white" />
          </span>
        )}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${statusColor(post.status)}`}>
            {post.status === 'published' ? '● Published' : '● Draft'}
          </span>
        </div>
        <div className="absolute bottom-3 left-4 right-4">
          <span className="text-white/80 text-xs">{post.category}</span>
        </div>
      </div>

      <div className="p-5">
        <h4 className="font-bold text-gray-900 text-base leading-tight mb-1.5 line-clamp-2">{post.title}</h4>
        {post.excerpt && <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-3">{post.excerpt}</p>}

        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400 mb-4">
          <div className="flex items-center space-x-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{post.status === 'published' ? formatDate(post.published_at) : `Updated ${formatDate(post.updated_at)}`}</span>
          </div>
          {post.status === 'published' && (
            <>
              <span className="text-gray-200">•</span>
              <div className="flex items-center space-x-1">
                <Eye className="h-3.5 w-3.5" />
                <span>{post.view_count ?? 0} views</span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onEdit(post)}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Edit className="h-3.5 w-3.5" /><span>Edit</span>
            </button>
            <button
              onClick={() => onDelete(post)}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /><span>Delete</span>
            </button>
          </div>
          {post.status === 'published' && (
            <a
              href={`${PUBLIC_BASE}/blog/${post.slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1 text-sm text-emerald-600 font-medium hover:text-emerald-700"
            >
              <span>View</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MediaUploadField — shared by cover image + cover video
// ─────────────────────────────────────────────────────────────────────────────
const MediaUploadField = ({ label, icon: Icon, mediaType, value, onChange, accept }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [localError, setLocalError] = useState('');
  const inputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalError('');
    setUploading(true);
    setProgress(0);
    try {
      const { publicUrl, key } = await uploadBlogMedia(file, mediaType, setProgress);
      onChange({ url: publicUrl, key });
    } catch (err) {
      setLocalError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>

      {value?.url ? (
        <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
          {mediaType === 'image' ? (
            <img src={value.url} alt={label} className="w-full h-40 object-cover" />
          ) : (
            <video src={value.url} controls className="w-full h-40 object-cover bg-black" />
          )}
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 text-emerald-500 animate-spin mb-2" />
              <span className="text-xs text-gray-500">{progress}%</span>
            </>
          ) : (
            <>
              <Icon className="h-6 w-6 text-gray-400 mb-2" />
              <span className="text-xs text-gray-500">Click to upload {mediaType}</span>
            </>
          )}
          <input ref={inputRef} type="file" accept={accept} onChange={handleFile} className="hidden" disabled={uploading} />
        </label>
      )}
      {localError && <p className="text-xs text-red-500 mt-1">{localError}</p>}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AttachmentUploadField — PDF attachment (e.g. full magazine issue)
// ─────────────────────────────────────────────────────────────────────────────
const AttachmentUploadField = ({ value, onChange }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [localError, setLocalError] = useState('');
  const inputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalError('');
    setUploading(true);
    setProgress(0);
    try {
      const { publicUrl, key, name } = await uploadBlogAttachment(file, setProgress);
      onChange({ url: publicUrl, key, name: name || file.name });
    } catch (err) {
      setLocalError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Attach magazine / full document <span className="text-gray-400 font-normal">(PDF, optional)</span>
      </label>

      {value?.url ? (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border border-gray-200 rounded-xl bg-gray-50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-red-50 rounded-lg flex-shrink-0">
              <FileText className="h-5 w-5 text-red-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{value.name || 'Attached PDF'}</p>
              <a href={value.url} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 hover:underline">Preview</a>
            </div>
          </div>
          <button type="button" onClick={() => onChange(null)} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 h-16 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
              <span className="text-xs text-gray-500">{progress}%</span>
            </>
          ) : (
            <>
              <FileText className="h-5 w-5 text-gray-400" />
              <span className="text-xs text-gray-500">Click to upload PDF (max 25MB)</span>
            </>
          )}
          <input ref={inputRef} type="file" accept="application/pdf" onChange={handleFile} className="hidden" disabled={uploading} />
        </label>
      )}
      {localError && <p className="text-xs text-red-500 mt-1">{localError}</p>}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PostEditorModal
// ─────────────────────────────────────────────────────────────────────────────
const emptyForm = {
  title: '', slug: '', excerpt: '', content: '',
  category: 'News', tags: '', meta_title: '', meta_description: '',
  author_name: '',
  cover_image: null, // { url, key }
  cover_video: null,
  attachment: null,  // { url, key, name }
};

const PostEditorModal = ({ post, onClose, onSaved }) => {
  const [form, setForm] = useState(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!post) { setForm(emptyForm); return; }
    (async () => {
      setLoading(true);
      try {
        const full = await getBlogPost(post.id);
        setForm({
          title: full.title || '',
          slug: full.slug || '',
          excerpt: full.excerpt || '',
          content: full.content || '',
          category: full.category || 'News',
          tags: (full.tags || []).join(', '),
          meta_title: full.meta_title || '',
          meta_description: full.meta_description || '',
          author_name: full.author_name || '',
          cover_image: full.cover_image_url ? { url: full.cover_image_url, key: full.cover_image_key } : null,
          cover_video: full.cover_video_url ? { url: full.cover_video_url, key: full.cover_video_key } : null,
          attachment: full.attachment_url ? { url: full.attachment_url, key: full.attachment_key, name: full.attachment_name } : null,
        });
        setSlugTouched(true);
      } catch (err) {
        setError(err.message || 'Failed to load post');
      } finally {
        setLoading(false);
      }
    })();
  }, [post]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleTitleChange = (title) => {
    update({ title, ...(slugTouched ? {} : { slug: slugify(title) }) });
  };

  const slugify = (str) =>
    str.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

  const buildPayload = (status) => ({
    title: form.title,
    slug: form.slug,
    excerpt: form.excerpt,
    content: form.content,
    category: form.category,
    tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    meta_title: form.meta_title,
    meta_description: form.meta_description,
    author_name: form.author_name,
    cover_image_url: form.cover_image?.url || null,
    cover_image_key: form.cover_image?.key || null,
    cover_video_url: form.cover_video?.url || null,
    cover_video_key: form.cover_video?.key || null,
    attachment_url: form.attachment?.url || null,
    attachment_key: form.attachment?.key || null,
    attachment_name: form.attachment?.name || null,
    status,
  });

  const handleSave = async (status) => {
    if (!form.title.trim() || !form.content.trim()) {
      setError('Title and content are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload(status);
      if (post) await updateBlogPost(post.id, payload);
      else await createBlogPost(payload);
      onSaved();
    } catch (err) {
      setError(err.message || 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-bold text-gray-900">{post ? 'Edit Post' : 'New Blog Post'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="7 Things First-Time Pilgrims Wish They Knew"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Slug <span className="text-gray-400 font-normal">— /blog/{form.slug || '…'}</span>
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => { setSlugTouched(true); update({ slug: e.target.value }); }}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Excerpt</label>
              <textarea
                value={form.excerpt}
                onChange={(e) => update({ excerpt: e.target.value })}
                rows={2}
                placeholder="One or two sentences shown on the blog index and in social previews."
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Content (Markdown)</label>
              <textarea
                value={form.content}
                onChange={(e) => update({ content: e.target.value })}
                rows={12}
                placeholder="## Heading&#10;&#10;Write your post in markdown…"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <MediaUploadField
                label="Cover image" icon={ImageIcon} mediaType="image" accept="image/jpeg,image/png,image/webp,image/gif"
                value={form.cover_image} onChange={(v) => update({ cover_image: v })}
              />
              <MediaUploadField
                label="Cover video (optional)" icon={Video} mediaType="video" accept="video/mp4,video/webm,video/quicktime"
                value={form.cover_video} onChange={(v) => update({ cover_video: v })}
              />
            </div>

            <AttachmentUploadField
              value={form.attachment}
              onChange={(v) => update({ attachment: v })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => update({ category: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tags <span className="text-gray-400 font-normal">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => update({ tags: e.target.value })}
                  placeholder="hajj, nairobi, budget"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Author name</label>
              <input
                type="text"
                value={form.author_name}
                onChange={(e) => update({ author_name: e.target.value })}
                placeholder="UmrahMarket Team"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="border-t border-gray-100 pt-5 space-y-4">
              <h4 className="text-sm font-semibold text-gray-900">SEO</h4>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700">Meta title</label>
                  <span className={`text-xs ${form.meta_title.length > 60 ? 'text-red-500' : 'text-gray-400'}`}>
                    {form.meta_title.length}/60
                  </span>
                </div>
                <input
                  type="text"
                  value={form.meta_title}
                  onChange={(e) => update({ meta_title: e.target.value })}
                  placeholder={form.title || 'Defaults to the post title'}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700">Meta description</label>
                  <span className={`text-xs ${form.meta_description.length > 160 ? 'text-red-500' : 'text-gray-400'}`}>
                    {form.meta_description.length}/160
                  </span>
                </div>
                <textarea
                  value={form.meta_description}
                  onChange={(e) => update({ meta_description: e.target.value })}
                  rows={2}
                  placeholder={form.excerpt || 'Defaults to the excerpt'}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {!loading && (
          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <FileEdit className="h-4 w-4" /><span>Save draft</span>
            </button>
            <button
              onClick={() => handleSave('published')}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all font-medium text-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span>{saving ? 'Publishing…' : 'Publish'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Delete Confirmation Modal
// ─────────────────────────────────────────────────────────────────────────────
const DeleteModal = ({ post, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-red-100 rounded-full">
          <Trash2 className="h-5 w-5 text-red-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Delete Post</h3>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        Are you sure you want to delete <span className="font-semibold text-gray-900">"{post.title}"</span>?
        This action cannot be undone.
      </p>
      <div className="flex space-x-3">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          <span>{loading ? 'Deleting…' : 'Delete'}</span>
        </button>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// BlogTab
// ─────────────────────────────────────────────────────────────────────────────
const BlogTab = () => {
  const [posts, setPosts]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [editorOpen, setEditorOpen]   = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBlogPosts({ status: statusFilter, category: categoryFilter });
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load posts.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteBlogPost(deleteTarget.id);
      setPosts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      alert(err.message || 'Failed to delete post.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const publishedCount = posts.filter((p) => p.status === 'published').length;
  const draftCount = posts.length - publishedCount;

  const filteredPosts = posts.filter((p) => {
    const q = searchQuery.toLowerCase();
    return !q || p.title?.toLowerCase().includes(q) || p.excerpt?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Blog</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {posts.length} total · {publishedCount} published · {draftCount} draft
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchPosts}
            disabled={loading}
            className="p-2 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { setEditingPost(null); setEditorOpen(true); }}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all font-medium text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Post</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search posts…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Loader2 className="h-10 w-10 animate-spin mb-4 text-emerald-500" />
          <p className="text-sm">Loading posts…</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-red-700 mb-1">Failed to load posts</p>
          <p className="text-xs text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchPosts}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" /><span>Retry</span>
          </button>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Newspaper className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No posts found</h3>
          <p className="text-sm text-gray-500 mb-6">
            {searchQuery ? `No results for "${searchQuery}"` : 'Publish your first post to start building trust with pilgrims.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => { setEditingPost(null); setEditorOpen(true); }}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg transition-all font-medium text-sm"
            >
              <Plus className="h-4 w-4" /><span>New Post</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <BlogPostCard
              key={post.id}
              post={post}
              onEdit={(p) => { setEditingPost(p); setEditorOpen(true); }}
              onDelete={(p) => setDeleteTarget(p)}
            />
          ))}
        </div>
      )}

      {editorOpen && (
        <PostEditorModal
          post={editingPost}
          onClose={() => setEditorOpen(false)}
          onSaved={() => { setEditorOpen(false); fetchPosts(); }}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          post={deleteTarget}
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default BlogTab;