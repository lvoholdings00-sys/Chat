import React, { useState } from 'react';
import { ChevronLeft, Pin, Send, Megaphone, ShieldCheck } from 'lucide-react';
import type { NewsPost, User } from '../types';

interface NewsViewProps {
  posts: NewsPost[];
  currentUser: User;
  onPostNews: (data: { title: string; body: string; isPinned: boolean }) => Promise<void>;
  onBackMobile?: () => void;
}

export const NewsView: React.FC<NewsViewProps> = ({
  posts,
  currentUser,
  onPostNews,
  onBackMobile,
}) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canPost = currentUser.isAdmin || currentUser.isLeader;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError('Both headline and body text are required.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onPostNews({
        title: title.trim(),
        body: body.trim(),
        isPinned,
      });
      setTitle('');
      setBody('');
      setIsPinned(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish announcement.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Sort: pinned first, then newest
  const sortedPosts = [...posts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="flex-1 flex flex-col bg-[#0f1016] h-full overflow-y-auto p-4 md:p-6">
      {/* View Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          {onBackMobile && (
            <button
              onClick={onBackMobile}
              className="md:hidden p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10"
              title="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="font-['Fraunces'] text-2xl font-bold text-white tracking-wide">
              Official Dispatches & News
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Authoritative updates, operations briefs, and gatekeeper announcements.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl w-full mx-auto space-y-6">
        {/* News Compose Card for Authorized Members */}
        {canPost && (
          <div className="bg-[#14161f] border border-white/10 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <Megaphone className="w-4 h-4 text-indigo-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white font-mono">
                Broadcast Directive
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Directive Headline…"
                className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 font-semibold"
                required
              />

              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What is the operational update or executive announcement?"
                rows={3}
                className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 resize-y leading-relaxed"
                required
              />

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300 select-none">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-0 w-4 h-4"
                  />
                  <span className="flex items-center gap-1 font-medium">
                    <Pin className="w-3.5 h-3.5 text-amber-400" /> Pin Directive to Top
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submitting ? 'Broadcasting…' : 'Publish Dispatch'}
                </button>
              </div>

              {error && <p className="text-xs text-rose-400 mt-2">{error}</p>}
            </form>
          </div>
        )}

        {/* News Feed List */}
        <div className="space-y-4">
          {sortedPosts.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
              <p className="text-xs text-neutral-400">No announcements published yet.</p>
            </div>
          ) : (
            sortedPosts.map((post) => (
              <article
                key={post.id}
                className={`p-5 rounded-2xl border transition-all ${
                  post.isPinned
                    ? 'bg-[#151824] border-amber-500/40 shadow-lg shadow-amber-500/5'
                    : 'bg-[#14161f] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {post.isPinned && (
                      <span className="flex items-center gap-1 text-[9.5px] font-mono tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                        <Pin className="w-3 h-3" /> PINNED DIRECTIVE
                      </span>
                    )}
                    <h2 className="text-sm md:text-base font-semibold text-white tracking-wide">
                      {post.title}
                    </h2>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono shrink-0">
                    {new Date(post.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-3 text-[11px] text-neutral-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Authorized by</span>
                  <span className="text-neutral-200 font-medium">{post.authorName}</span>
                </div>

                <div className="text-xs md:text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap selection:bg-indigo-500/30">
                  {post.body}
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
