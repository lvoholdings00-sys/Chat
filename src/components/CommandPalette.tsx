import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Hash,
  MessageSquare,
  Calendar,
  Newspaper,
  Shield,
  Smile,
  Keyboard,
  X,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import type { User, Channel, ActiveTab, ChatTarget } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  allUsers: User[];
  channels: Channel[];
  onlineUserIds: string[];
  onSelectTarget: (target: ChatTarget) => void;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenAdmin: () => void;
  onOpenStatusModal: () => void;
  onOpenShortcutsModal: () => void;
}

interface PaletteItem {
  id: string;
  category: 'channel' | 'direct' | 'action';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: string;
  statusBadge?: string;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  channels,
  onlineUserIds,
  onSelectTarget,
  onSelectTab,
  onOpenAdmin,
  onOpenStatusModal,
  onOpenShortcutsModal,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const myChannels = channels.filter((c) => c.memberIds.includes(currentUser.id));
  const otherUsers = allUsers.filter((u) => u.id !== currentUser.id);

  // Build items list
  const channelItems: PaletteItem[] = myChannels.map((c) => ({
    id: `channel_${c.id}`,
    category: 'channel',
    title: `#${c.name}`,
    subtitle: c.description || (c.type === 'announcement' ? 'Broadcast Channel' : 'Group Channel'),
    icon: <span className="text-base shrink-0">{c.icon || '💬'}</span>,
    badge: c.type === 'announcement' ? 'Broadcast' : undefined,
    action: () => {
      onSelectTab('chat');
      onSelectTarget({
        type: 'channel',
        id: c.id,
        name: c.name,
        icon: c.icon,
        channelType: c.type,
      });
      onClose();
    },
  }));

  const directItems: PaletteItem[] = otherUsers.map((u) => {
    const isOnline = onlineUserIds.includes(u.id);
    return {
      id: `user_${u.id}`,
      category: 'direct',
      title: u.displayName,
      subtitle: u.customStatus?.text
        ? `${u.customStatus.emoji || '💬'} ${u.customStatus.text}`
        : `@${u.username}`,
      icon: (
        <div className="relative shrink-0">
          <div className="w-5 h-5 rounded-md bg-neutral-800 border border-white/10 flex items-center justify-center text-xs overflow-hidden">
            {u.avatar.startsWith('data:') ? (
              <img src={u.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              u.avatar
            )}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
              isOnline ? 'bg-emerald-400 ring-1 ring-emerald-400/50' : 'bg-neutral-600'
            }`}
          />
        </div>
      ),
      badge: u.isLeader ? 'Leader' : undefined,
      statusBadge: u.customStatus?.text ? `${u.customStatus.emoji || '💬'} ${u.customStatus.text}` : undefined,
      action: () => {
        onSelectTab('chat');
        onSelectTarget({
          type: 'direct',
          id: u.id,
          name: u.displayName,
          avatar: u.avatar,
          status: isOnline ? 'online' : 'offline',
          customStatus: u.customStatus,
          isLeader: u.isLeader,
        });
        onClose();
      },
    };
  });

  const actionItems: PaletteItem[] = [
    {
      id: 'action_calendar',
      category: 'action',
      title: 'Jump to Calendar',
      subtitle: 'View operational timeline & schedule missions',
      icon: <Calendar className="w-4 h-4 text-indigo-400" />,
      badge: '⌘⇧C',
      action: () => {
        onSelectTab('calendar');
        onClose();
      },
    },
    {
      id: 'action_news',
      category: 'action',
      title: 'Jump to Executive News Feed',
      subtitle: 'Read official directives & broadcast logs',
      icon: <Newspaper className="w-4 h-4 text-indigo-400" />,
      badge: '⌘⇧N',
      action: () => {
        onSelectTab('news');
        onClose();
      },
    },
    {
      id: 'action_chat',
      category: 'action',
      title: 'Jump to Chat Console',
      subtitle: 'Real-time encrypted operational messaging',
      icon: <MessageSquare className="w-4 h-4 text-indigo-400" />,
      badge: '⌘⇧M',
      action: () => {
        onSelectTab('chat');
        onClose();
      },
    },
    {
      id: 'action_status',
      category: 'action',
      title: 'Set Custom Status Message',
      subtitle: 'Update your operational focus or availability badge',
      icon: <Smile className="w-4 h-4 text-amber-400" />,
      action: () => {
        onClose();
        onOpenStatusModal();
      },
    },
    {
      id: 'action_shortcuts',
      category: 'action',
      title: 'Keyboard Shortcuts Reference',
      subtitle: 'View all tactical power-user keybindings',
      icon: <Keyboard className="w-4 h-4 text-indigo-400" />,
      badge: '?',
      action: () => {
        onClose();
        onOpenShortcutsModal();
      },
    },
  ];

  if (currentUser.isAdmin) {
    actionItems.splice(3, 0, {
      id: 'action_admin',
      category: 'action',
      title: 'Gatekeeper Admin Governance',
      subtitle: 'User access control, channel config & audit transcripts',
      icon: <Shield className="w-4 h-4 text-amber-400" />,
      badge: '⌘⇧A',
      action: () => {
        onClose();
        onOpenAdmin();
      },
    });
  }

  // Filter items
  const q = query.toLowerCase().trim();
  const filterFn = (item: PaletteItem) =>
    item.title.toLowerCase().includes(q) ||
    (item.subtitle && item.subtitle.toLowerCase().includes(q));

  const filteredChannels = q ? channelItems.filter(filterFn) : channelItems;
  const filteredUsers = q ? directItems.filter(filterFn) : directItems;
  const filteredActions = q ? actionItems.filter(filterFn) : actionItems;

  const allFiltered = [...filteredChannels, ...filteredUsers, ...filteredActions];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (allFiltered.length > 0 ? (prev + 1) % allFiltered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (allFiltered.length > 0 ? (prev - 1 + allFiltered.length) % allFiltered.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allFiltered[selectedIndex]) {
        allFiltered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      id="command-palette-backdrop"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-start justify-center pt-16 md:pt-24 px-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="command-palette-modal"
        className="w-full max-w-xl bg-[#14161f] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-white/10 flex items-center gap-3 bg-[#181a24]">
          <Search className="w-4 h-4 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a channel, contact, or command (e.g. #general, Elena, calendar)…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-500 focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="p-1 text-neutral-400 hover:text-white rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-neutral-400 bg-white/5 border border-white/10 rounded">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-3">
          {allFiltered.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 text-xs">
              <p>No channels, contacts, or tactical commands found for "{query}".</p>
              <p className="mt-1 text-neutral-500">Try searching by user name, status, or #channel.</p>
            </div>
          ) : (
            <>
              {filteredChannels.length > 0 && (
                <div>
                  <p className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">
                    Channels ({filteredChannels.length})
                  </p>
                  <div className="space-y-0.5">
                    {filteredChannels.map((item) => {
                      const idx = allFiltered.indexOf(item);
                      const isSelected = idx === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.action}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                              : 'hover:bg-white/5 text-neutral-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {item.icon}
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{item.title}</p>
                              {item.subtitle && (
                                <p className={`text-[10px] truncate ${isSelected ? 'text-indigo-200' : 'text-neutral-400'}`}>
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                          {item.badge && (
                            <span
                              className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded shrink-0 ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {filteredUsers.length > 0 && (
                <div>
                  <p className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">
                    Personnel ({filteredUsers.length})
                  </p>
                  <div className="space-y-0.5">
                    {filteredUsers.map((item) => {
                      const idx = allFiltered.indexOf(item);
                      const isSelected = idx === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.action}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                              : 'hover:bg-white/5 text-neutral-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {item.icon}
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{item.title}</p>
                              {item.subtitle && (
                                <p className={`text-[10px] truncate ${isSelected ? 'text-indigo-200' : 'text-neutral-400'}`}>
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.statusBadge && (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full border truncate max-w-[140px] ${
                                  isSelected
                                    ? 'bg-white/20 text-white border-white/20'
                                    : 'bg-white/5 text-neutral-300 border-white/10'
                                }`}
                              >
                                {item.statusBadge}
                              </span>
                            )}
                            {item.badge && (
                              <span
                                className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                                  isSelected ? 'bg-white/20 text-white' : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {filteredActions.length > 0 && (
                <div>
                  <p className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">
                    Quick Actions ({filteredActions.length})
                  </p>
                  <div className="space-y-0.5">
                    {filteredActions.map((item) => {
                      const idx = allFiltered.indexOf(item);
                      const isSelected = idx === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.action}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                              : 'hover:bg-white/5 text-neutral-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1.5 rounded-lg bg-white/5 shrink-0">{item.icon}</div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{item.title}</p>
                              {item.subtitle && (
                                <p className={`text-[10px] truncate ${isSelected ? 'text-indigo-200' : 'text-neutral-400'}`}>
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                          {item.badge && (
                            <kbd
                              className={`text-[10px] font-mono px-2 py-0.5 rounded border shrink-0 ${
                                isSelected
                                  ? 'bg-white/20 text-white border-white/30'
                                  : 'bg-white/5 text-neutral-400 border-white/10'
                              }`}
                            >
                              {item.badge}
                            </kbd>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Hint Bar */}
        <div className="p-2.5 border-t border-white/10 bg-[#151720] flex items-center justify-between text-[11px] text-neutral-400 font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.2 bg-white/5 border border-white/10 rounded">↑↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.2 bg-white/5 border border-white/10 rounded">↵</kbd>
              <span>Select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.2 bg-white/5 border border-white/10 rounded">ESC</kbd>
              <span>Exit</span>
            </span>
          </div>
          <span className="text-indigo-400 font-semibold">LVO Tactical Command</span>
        </div>
      </div>
    </div>
  );
};
