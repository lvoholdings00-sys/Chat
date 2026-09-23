import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MessageSquare, Hash, User as UserIcon, Calendar, ArrowRight, Loader2, FileText, CornerDownLeft } from 'lucide-react';
import type { User, Channel, Message, ChatTarget } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  allUsers: User[];
  channels: Channel[];
  onJumpToMessage: (target: ChatTarget, messageId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  channels,
  onJumpToMessage,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterScope, setFilterScope] = useState<'all' | 'channels' | 'dms'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search query
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const userIdParam = currentUser?.id ? `&currentUserId=${encodeURIComponent(currentUser.id)}` : '';
        const res = await fetch(`/api/messages/search?q=${encodeURIComponent(query.trim())}${userIdParam}`);
        const data = await res.json();
        if (data.results) {
          setResults(data.results);
        }
      } catch (err) {
        console.warn('Search request failed:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, currentUser?.id]);

  if (!isOpen) return null;

  // Filter results according to scope
  const filteredResults = results.filter((msg) => {
    if (filterScope === 'channels') return !!msg.channelId;
    if (filterScope === 'dms') return !!msg.recipientId;
    return true;
  });

  const handleSelectResult = (msg: Message) => {
    let target: ChatTarget | null = null;
    if (msg.channelId) {
      const ch = channels.find((c) => c.id === msg.channelId);
      if (ch) {
        target = {
          type: 'channel',
          id: ch.id,
          name: ch.name,
          icon: ch.icon,
          channelType: ch.type,
        };
      }
    } else if (msg.recipientId) {
      const currentId = currentUser?.id;
      const peerId = currentId && msg.senderId === currentId ? msg.recipientId : msg.senderId;
      const peer = allUsers.find((u) => u.id === peerId);
      if (peer) {
        target = {
          type: 'direct',
          id: peer.id,
          name: peer.displayName,
          avatar: peer.avatar,
        };
      }
    }

    if (target) {
      onJumpToMessage(target, msg.id);
      onClose();
    }
  };

  // Format highlighted text
  const renderHighlightedSnippet = (text: string, q: string) => {
    if (!q.trim() || !text) return text;
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-amber-400/30 text-amber-200 font-semibold px-0.5 rounded">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 bg-black/75 backdrop-blur-sm p-3 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#141620] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="p-3.5 bg-[#181b27] border-b border-white/10 flex items-center gap-3 shrink-0">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages, files, and people…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-500 focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />}
          {query && !loading && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-neutral-400 hover:text-white rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scope Filters */}
        <div className="px-4 py-2 bg-[#12141c] border-b border-white/5 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterScope('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterScope === 'all'
                  ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              All Messages
            </button>
            <button
              type="button"
              onClick={() => setFilterScope('channels')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterScope === 'channels'
                  ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              Channels
            </button>
            <button
              type="button"
              onClick={() => setFilterScope('dms')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterScope === 'dms'
                  ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              Direct Messages
            </button>
          </div>

          <span className="text-[11px] font-mono text-neutral-500">
            {query.trim() ? `${filteredResults.length} match${filteredResults.length === 1 ? '' : 'es'}` : 'Type to search'}
          </span>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {!query.trim() ? (
            <div className="py-12 text-center text-neutral-400 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-indigo-400">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium text-neutral-300">Global Archive Search</p>
              <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
                Search message text, technical logs, code snippets, or attachment filenames across all channels and direct messages.
              </p>
            </div>
          ) : loading && results.length === 0 ? (
            <div className="py-12 text-center text-neutral-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
              <p className="text-xs">Searching encrypted archives…</p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="py-12 text-center text-neutral-400">
              <p className="text-xs font-semibold text-neutral-300">No message history matches "{query}"</p>
              <p className="text-[11px] text-neutral-500 mt-1">Try another keyword or scope filter.</p>
            </div>
          ) : (
            filteredResults.map((msg) => {
              const author = allUsers.find((u) => u.id === msg.senderId);
              const isChannel = !!msg.channelId;
              const ch = isChannel ? channels.find((c) => c.id === msg.channelId) : null;
              const peerId = msg.recipientId
                ? currentUser?.id && msg.senderId === currentUser.id
                  ? msg.recipientId
                  : msg.senderId
                : null;
              const peer = peerId ? allUsers.find((u) => u.id === peerId) : null;

              return (
                <div
                  key={msg.id}
                  onClick={() => handleSelectResult(msg)}
                  className="p-3 rounded-xl bg-white/[0.03] hover:bg-indigo-600/10 border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Context Badge */}
                      {isChannel ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono shrink-0">
                          <Hash className="w-3 h-3" />
                          {ch?.name || 'Channel'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono shrink-0">
                          <UserIcon className="w-3 h-3" />
                          {peer?.displayName || 'Direct'}
                        </span>
                      )}

                      <span className="text-xs font-semibold text-neutral-200 truncate">
                        {author?.displayName || 'Member'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono text-neutral-400">
                      <span>
                        {new Date(msg.timestamp).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>

                  {/* Message Content Snippet */}
                  {msg.text && (
                    <p className="text-xs text-neutral-300 leading-relaxed break-words line-clamp-2 pl-1 border-l-2 border-white/10 group-hover:border-indigo-500 transition-colors">
                      {renderHighlightedSnippet(msg.text, query)}
                    </p>
                  )}

                  {/* Attachment indicator if present */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-2 text-[10px] text-neutral-400 font-mono">
                      <FileText className="w-3 h-3 text-indigo-400" />
                      <span>{msg.attachments.length} attachment(s)</span>
                      {msg.attachments[0]?.name && (
                        <span className="text-neutral-500 truncate max-w-xs">
                          ({renderHighlightedSnippet(msg.attachments[0].name, query)})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-2.5 px-4 bg-[#10121a] border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-400 font-mono shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-white/10 text-neutral-300 text-[10px]">Enter</span>
            <span>Jump to conversation</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-white/10 text-neutral-300 text-[10px]">Esc</span>
            <span>Dismiss</span>
          </div>
        </div>
      </div>
    </div>
  );
};
