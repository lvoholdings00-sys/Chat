import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Calendar,
  Newspaper,
  Search,
  Plus,
  Settings,
  Shield,
  Volume2,
  VolumeX,
  LogOut,
  Users,
  ExternalLink,
  Edit2,
  Hash,
  Volume1,
  X,
  Smile,
  Keyboard,
  Command,
  Palette,
  Check,
  FileText,
  ArrowRight,
} from 'lucide-react';
import type { User, Channel, Message, ActiveTab, ChatTarget, AppTheme } from '../types';

interface NavigationRailProps {
  currentUser: User;
  allUsers: User[];
  channels: Channel[];
  messages: Message[];
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeChatTarget: ChatTarget | null;
  onSelectTarget: (target: ChatTarget) => void;
  onOpenAvatarModal: () => void;
  onOpenCreateChannelModal: () => void;
  onOpenAdminPanel: () => void;
  onOpenStatusModal: () => void;
  onOpenShortcutsModal: () => void;
  onOpenCommandPalette: () => void;
  onLogout: () => void;
  onSwitchUser: (username: string) => void;
  onlineUserIds: string[];
  isRealtimeConnected: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  currentTheme: AppTheme;
  onSelectTheme: (theme: AppTheme) => void;
  onOpenGlobalSearch: () => void;
  onJumpToMessage?: (target: ChatTarget, messageId: string) => void;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  currentUser,
  allUsers,
  channels,
  messages,
  activeTab,
  setActiveTab,
  activeChatTarget,
  onSelectTarget,
  onOpenAvatarModal,
  onOpenCreateChannelModal,
  onOpenAdminPanel,
  onOpenStatusModal,
  onOpenShortcutsModal,
  onOpenCommandPalette,
  onLogout,
  onSwitchUser,
  onlineUserIds,
  isRealtimeConnected,
  isMuted,
  onToggleMute,
  currentTheme,
  onSelectTheme,
  onOpenGlobalSearch,
  onJumpToMessage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<'roster' | 'messages'>('roster');
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  const [showThemePopover, setShowThemePopover] = useState(false);
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettingsPopover(false);
        setShowSwitchMenu(false);
      }
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setShowThemePopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter channels user is member of
  const myChannels = channels.filter((c) => c.memberIds.includes(currentUser.id));

  // Filter other users for Direct Messages
  const otherUsers = allUsers.filter((u) => u.id !== currentUser.id);

  // Search filtering
  const searchLower = searchQuery.toLowerCase().trim();
  const visibleChannels = searchLower
    ? myChannels.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          (c.description && c.description.toLowerCase().includes(searchLower))
      )
    : myChannels;

  const visibleUsers = searchLower
    ? otherUsers.filter(
        (u) =>
          u.displayName.toLowerCase().includes(searchLower) ||
          u.username.toLowerCase().includes(searchLower) ||
          (u.customStatus?.text && u.customStatus.text.toLowerCase().includes(searchLower))
      )
    : otherUsers;

  // Search matching messages across accessible history
  const matchingMessages = useMemo(() => {
    if (!searchLower) return [];
    return messages
      .filter((m) => {
        if (m.channelId && !myChannels.some((c) => c.id === m.channelId)) return false;
        if (m.recipientId && m.recipientId !== currentUser.id && m.senderId !== currentUser.id) return false;
        const matchText = m.text && m.text.toLowerCase().includes(searchLower);
        const matchAtt = m.attachments?.some((a) => a.name.toLowerCase().includes(searchLower));
        return matchText || matchAtt;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);
  }, [messages, searchLower, myChannels, currentUser.id]);

  const handleJumpToHistoryMessage = (msg: Message) => {
    let target: ChatTarget | null = null;
    if (msg.channelId) {
      const ch = channels.find((c) => c.id === msg.channelId);
      if (ch) {
        target = { type: 'channel', id: ch.id, name: ch.name, icon: ch.icon, channelType: ch.type };
      }
    } else if (msg.recipientId) {
      const peerId = msg.senderId === currentUser.id ? msg.recipientId : msg.senderId;
      const peer = allUsers.find((u) => u.id === peerId);
      if (peer) {
        target = { type: 'direct', id: peer.id, name: peer.displayName, avatar: peer.avatar };
      }
    }
    if (target) {
      if (onJumpToMessage) {
        onJumpToMessage(target, msg.id);
      } else {
        onSelectTarget(target);
      }
      setActiveTab('chat');
    }
  };

  const themeOptions: { id: AppTheme; name: string; desc: string; colors: string[] }[] = [
    { id: 'midnight', name: 'Midnight Tactical', desc: 'Obsidian dark with indigo glow', colors: ['#0d0e12', '#121319', '#6366f1'] },
    { id: 'slate', name: 'Cyber Slate', desc: 'Deep ocean navy with cyan glow', colors: ['#080d16', '#0e1626', '#0284c7'] },
    { id: 'emerald', name: 'Tactical Emerald', desc: 'Matrix stealth with mint green', colors: ['#07100b', '#0b1812', '#10b981'] },
    { id: 'amber', name: 'Solar Amber', desc: 'Titanium bronze with warm gold', colors: ['#110d0a', '#1a1410', '#d97706'] },
    { id: 'light', name: 'Studio Light', desc: 'High-contrast architectural light canvas', colors: ['#f4f5f8', '#ffffff', '#4f46e5'] },
  ];

  const hasAnyMatches = visibleChannels.length > 0 || visibleUsers.length > 0 || matchingMessages.length > 0;

  // Get last message snippet for a direct user
  const getLastDm = (peerId: string) => {
    const threadMsgs = messages
      .filter(
        (m) =>
          (m.senderId === currentUser.id && m.recipientId === peerId) ||
          (m.senderId === peerId && m.recipientId === currentUser.id)
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return threadMsgs[0];
  };

  return (
    <aside className="w-80 md:w-84 bg-[#121319] border-r border-white/10 flex flex-col h-full shrink-0 select-none z-20">
      {/* Rail Header */}
      <div className="p-4 border-b border-white/10 bg-[#151720]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-['Fraunces'] text-2xl font-bold tracking-widest text-white">
              𝐋𝐕𝐎
            </span>
            <span className="text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              SECURE
            </span>
          </div>
          <a
            href="https://online.lvo-cloud.cloud"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            ← lvo-cloud.cloud
          </a>
        </div>

        {/* Current User Row with Custom Status Trigger */}
        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-white/15 flex items-center justify-center text-lg overflow-hidden shrink-0 shadow-sm">
                  {currentUser.avatar.startsWith('data:') ? (
                    <img src={currentUser.avatar} alt="Me" className="w-full h-full object-cover" />
                  ) : (
                    currentUser.avatar
                  )}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-[#151720] rounded-full ${
                    currentUser.status === 'idle' ? 'bg-amber-400' : 'bg-emerald-500'
                  }`}
                  title={currentUser.status === 'idle' ? 'Away (Idle)' : 'Online'}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-white truncate">
                    {currentUser.displayName}
                  </p>
                  {currentUser.status === 'idle' && (
                    <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      AWAY
                    </span>
                  )}
                  {currentUser.isLeader && (
                    <span className="text-[8.5px] font-mono tracking-wider px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold shrink-0">
                      LEADER
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-neutral-400 font-mono">@{currentUser.username}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenAvatarModal}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Edit avatar & symbol"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* User's Custom Status Pill */}
          <button
            type="button"
            onClick={onOpenStatusModal}
            className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-left text-xs transition-colors group"
            title="Update custom status message"
          >
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="text-xs shrink-0">
                {currentUser.customStatus?.emoji || '💬'}
              </span>
              <span className={`text-[11px] truncate ${currentUser.customStatus?.text ? 'text-neutral-200' : 'text-neutral-500 group-hover:text-neutral-300'}`}>
                {currentUser.customStatus?.text || 'Set status message…'}
              </span>
            </div>
            <Smile className="w-3 h-3 text-neutral-500 group-hover:text-indigo-300 shrink-0" />
          </button>
        </div>
      </div>

      {/* Teams-Style Top Navigation Tabs */}
      <nav className="flex gap-1 p-2 bg-[#0e0f14] border-b border-white/10 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'chat'
              ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/40 shadow-sm shadow-indigo-600/10'
              : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'calendar'
              ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/40 shadow-sm shadow-indigo-600/10'
              : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Calendar</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('news')}
          className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'news'
              ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/40 shadow-sm shadow-indigo-600/10'
              : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Newspaper className="w-4 h-4" />
          <span>News</span>
        </button>
      </nav>

      {/* Search Bar (Filters Channels, Contacts, and Message History) */}
      <div className="p-3 pb-2 border-b border-white/5 relative shrink-0">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 pointer-events-none" />
          <input
            id="rail-search-bar"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search channels, people, messages…"
            className="w-full pl-8 pr-14 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 focus:bg-white/[0.07] transition-all"
          />
          <div className="absolute right-2 flex items-center gap-1">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 text-neutral-400 hover:text-white rounded"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenGlobalSearch}
                className="p-1 text-neutral-400 hover:text-indigo-300 rounded transition-colors"
                title="Open Global Archive Search (⌘F)"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {searchLower && (
          <div className="mt-2 space-y-1.5">
            {/* Search Scope Switcher */}
            <div className="flex items-center gap-1 p-0.5 bg-black/40 rounded-lg border border-white/5">
              <button
                type="button"
                onClick={() => setSearchScope('roster')}
                className={`flex-1 py-1 text-[10px] font-medium rounded-md transition-colors text-center ${
                  searchScope === 'roster'
                    ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/30'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Roster ({visibleChannels.length + visibleUsers.length})
              </button>
              <button
                type="button"
                onClick={() => setSearchScope('messages')}
                className={`flex-1 py-1 text-[10px] font-medium rounded-md transition-colors text-center ${
                  searchScope === 'messages'
                    ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/30'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Messages ({matchingMessages.length})
              </button>
            </div>

            <div className="flex items-center justify-between px-1 text-[10px] text-neutral-400 font-mono">
              <button
                type="button"
                onClick={onOpenGlobalSearch}
                className="text-indigo-400 hover:underline inline-flex items-center gap-1"
              >
                <span>Full Archive Search</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-neutral-500 hover:text-neutral-300"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Roster or Message Search List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {searchLower && searchScope === 'messages' ? (
          /* MESSAGE HISTORY SEARCH RESULTS */
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase font-mono">
                Historical Matches ({matchingMessages.length})
              </span>
              <button
                type="button"
                onClick={onOpenGlobalSearch}
                className="text-[10px] text-indigo-400 hover:underline"
              >
                Deep Search
              </button>
            </div>

            {matchingMessages.length === 0 ? (
              <div className="py-8 text-center px-4">
                <p className="text-xs text-neutral-400">No messages match "{searchQuery}"</p>
                <button
                  type="button"
                  onClick={onOpenGlobalSearch}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  <Search className="w-3 h-3" /> Search complete archive
                </button>
              </div>
            ) : (
              matchingMessages.map((msg) => {
                const author = allUsers.find((u) => u.id === msg.senderId);
                const isChannel = !!msg.channelId;
                const ch = isChannel ? channels.find((c) => c.id === msg.channelId) : null;
                const peerId = msg.recipientId
                  ? msg.senderId === currentUser.id
                    ? msg.recipientId
                    : msg.senderId
                  : null;
                const peer = peerId ? allUsers.find((u) => u.id === peerId) : null;

                return (
                  <div
                    key={msg.id}
                    onClick={() => handleJumpToHistoryMessage(msg)}
                    className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-indigo-600/15 border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isChannel ? (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 truncate">
                            #{ch?.name || 'Channel'}
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 truncate">
                            @{peer?.displayName || 'DM'}
                          </span>
                        )}
                        <span className="text-[11px] font-medium text-neutral-200 truncate">
                          {author?.displayName || 'User'}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-neutral-500 shrink-0">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {msg.text && (
                      <p className="text-[11px] text-neutral-300 line-clamp-2 leading-relaxed pl-1 border-l border-white/10 group-hover:border-indigo-400">
                        {msg.text}
                      </p>
                    )}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-1 flex items-center gap-1 text-[9px] font-mono text-neutral-400">
                        <FileText className="w-2.5 h-2.5 text-indigo-400" />
                        <span className="truncate">{msg.attachments[0].name}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : !hasAnyMatches && searchLower ? (
          <div className="py-8 text-center px-4">
            <p className="text-xs text-neutral-400">No channels or personnel match "{searchQuery}"</p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-2 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Clear filter
            </button>
          </div>
        ) : (
          <>
            {/* CHANNELS SECTION */}
            {visibleChannels.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-2 mb-1.5">
                  <span className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase font-mono">
                    Channels {searchLower ? `(${visibleChannels.length})` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={onOpenCreateChannelModal}
                    className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Create channel"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-0.5">
                  {visibleChannels.map((c) => {
                    const isSelected =
                      activeTab === 'chat' &&
                      activeChatTarget?.type === 'channel' &&
                      activeChatTarget.id === c.id;

                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setActiveTab('chat');
                          onSelectTarget({
                            type: 'channel',
                            id: c.id,
                            name: c.name,
                            icon: c.icon,
                            channelType: c.type,
                          });
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
                            : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-sm shrink-0">{c.icon}</span>
                          <span className="text-xs truncate font-medium">#{c.name}</span>
                        </div>
                        {c.type === 'announcement' && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-mono shrink-0 ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            }`}
                          >
                            Broadcast
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* DIRECT MESSAGES / RECENT CHATS */}
            {visibleUsers.length > 0 && (
              <div>
                <div className="px-2 mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase font-mono">
                    Direct Messages {searchLower ? `(${visibleUsers.length})` : ''}
                  </span>
                </div>

                <div className="space-y-0.5">
                  {visibleUsers.map((u) => {
                    const isOnline = onlineUserIds.includes(u.id);
                    const isSelected =
                      activeTab === 'chat' &&
                      activeChatTarget?.type === 'direct' &&
                      activeChatTarget.id === u.id;
                    const lastMsg = getLastDm(u.id);

                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setActiveTab('chat');
                          onSelectTarget({
                            type: 'direct',
                            id: u.id,
                            name: u.displayName,
                            avatar: u.avatar,
                            status: isOnline ? 'online' : 'offline',
                            customStatus: u.customStatus,
                            isLeader: u.isLeader,
                          });
                        }}
                        className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
                            : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="relative shrink-0 mt-0.5">
                          <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-white/10 flex items-center justify-center text-xs overflow-hidden">
                            {u.avatar.startsWith('data:') ? (
                              <img src={u.avatar} alt={u.displayName} className="w-full h-full object-cover" />
                            ) : (
                              u.avatar
                            )}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${
                              isSelected ? 'border-indigo-600' : 'border-[#121319]'
                            } ${
                              isOnline
                                ? 'bg-emerald-400 ring-1 ring-emerald-400/40'
                                : u.status === 'idle'
                                ? 'bg-amber-400'
                                : 'bg-neutral-600'
                            }`}
                            title={isOnline ? 'Online' : u.status || 'Offline'}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-medium truncate">{u.displayName}</p>
                            {u.isLeader && (
                              <span
                                className={`text-[8px] font-mono px-1 py-0.2 rounded shrink-0 ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                }`}
                              >
                                LEADER
                              </span>
                            )}
                          </div>

                          {/* Custom Status Message display alongside user */}
                          {u.customStatus?.text && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] shrink-0">
                                {u.customStatus.emoji || '💬'}
                              </span>
                              <span
                                className={`text-[10.5px] truncate font-mono ${
                                  isSelected ? 'text-indigo-100' : 'text-amber-300/85'
                                }`}
                                title={u.customStatus.text}
                              >
                                {u.customStatus.text}
                              </span>
                            </div>
                          )}

                          {lastMsg ? (
                            <p
                              className={`text-[10px] truncate mt-0.5 ${
                                isSelected ? 'text-indigo-200' : 'text-neutral-500'
                              }`}
                            >
                              {lastMsg.senderId === currentUser.id ? 'You: ' : ''}
                              {lastMsg.text || 'Shared attachment'}
                            </p>
                          ) : !u.customStatus?.text ? (
                            <p
                              className={`text-[10px] truncate mt-0.5 ${
                                isSelected ? 'text-indigo-200' : 'text-neutral-500'
                              }`}
                            >
                              @{u.username}
                            </p>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Rail Footer */}
      <div className="p-3 border-t border-white/10 bg-[#151720] flex items-center justify-between shrink-0 relative" ref={settingsRef}>
        {/* Real-time Status Indicator */}
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isRealtimeConnected
                ? 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400'
                : 'bg-amber-500'
            }`}
          />
          <span className="text-[11px] font-mono text-neutral-400">
            {isRealtimeConnected ? 'LIVE SYNC' : 'RECONNECTING'}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenGlobalSearch}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title="Global Message History Search (⌘F)"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Theme Palette Toggle */}
          <div className="relative" ref={themeRef}>
            <button
              type="button"
              onClick={() => setShowThemePopover(!showThemePopover)}
              className={`p-1.5 rounded-lg transition-colors ${
                showThemePopover
                  ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40'
                  : 'text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
              title="Change Theme Palette"
            >
              <Palette className="w-4 h-4" />
            </button>

            {/* Theme Popover */}
            {showThemePopover && (
              <div className="absolute right-0 bottom-11 w-64 bg-[#181a24] border border-white/15 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in select-none">
                <div className="px-2.5 py-1.5 border-b border-white/5 flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs font-semibold text-white">Color Palettes</span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase">5 Themes</span>
                </div>
                <div className="space-y-1">
                  {themeOptions.map((th) => {
                    const isActive = currentTheme === th.id || (th.id === 'midnight' && currentTheme === 'dark');
                    return (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => {
                          onSelectTheme(th.id);
                          setShowThemePopover(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                          isActive
                            ? 'bg-indigo-600/25 border border-indigo-500/40 text-white'
                            : 'hover:bg-white/5 text-neutral-300 border border-transparent'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold">{th.name}</span>
                            {isActive && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                          </div>
                          <p className="text-[10px] text-neutral-400 truncate">{th.desc}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {th.colors.map((c, i) => (
                            <span
                              key={i}
                              className="w-2.5 h-2.5 rounded-full border border-black/30 shadow-xs"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenShortcutsModal}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title="Keyboard Shortcuts (⌘/)"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title={isMuted ? 'Unmute Audio Pings' : 'Mute Audio Pings'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-neutral-500" /> : <Volume2 className="w-4 h-4 text-indigo-400" />}
          </button>

          <button
            type="button"
            onClick={() => setShowSettingsPopover(!showSettingsPopover)}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title="Settings & Personnel Options"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Popover */}
        {showSettingsPopover && (
          <div className="absolute right-3 bottom-14 w-60 bg-[#181a24] border border-white/15 rounded-2xl shadow-2xl p-1.5 z-40 animate-in fade-in">
            {currentUser.isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setShowSettingsPopover(false);
                  onOpenAdminPanel();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-amber-300 hover:bg-amber-500/10 rounded-xl transition-colors text-left"
              >
                <Shield className="w-4 h-4" />
                <span className="font-semibold">Gatekeeper Admin Panel</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setShowSettingsPopover(false);
                onOpenStatusModal();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-300 hover:bg-white/5 rounded-xl transition-colors text-left"
            >
              <Smile className="w-4 h-4 text-neutral-400" />
              <span>Set Custom Status</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowSettingsPopover(false);
                setShowThemePopover(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-300 hover:bg-white/5 rounded-xl transition-colors text-left"
            >
              <Palette className="w-4 h-4 text-indigo-400" />
              <span>Color Palette Theme</span>
              <span className="ml-auto text-[9px] font-mono text-neutral-400 capitalize">{currentTheme}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowSettingsPopover(false);
                onOpenShortcutsModal();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-300 hover:bg-white/5 rounded-xl transition-colors text-left"
            >
              <Keyboard className="w-4 h-4 text-neutral-400" />
              <span>Keyboard Shortcuts</span>
              <kbd className="ml-auto text-[9px] font-mono text-neutral-500">⌘/</kbd>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowSettingsPopover(false);
                onOpenCommandPalette();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-300 hover:bg-white/5 rounded-xl transition-colors text-left"
            >
              <Command className="w-4 h-4 text-neutral-400" />
              <span>Command Switcher</span>
              <kbd className="ml-auto text-[9px] font-mono text-neutral-500">⌘K</kbd>
            </button>

            <div className="my-1 border-t border-white/5" />

            {/* Quick Switch User */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSwitchMenu(!showSwitchMenu)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-neutral-300 hover:bg-white/5 rounded-xl transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-neutral-400" />
                  <span>Switch User</span>
                </div>
                <span className="text-[10px] text-neutral-500">▾</span>
              </button>

              {showSwitchMenu && (
                <div className="p-1 space-y-0.5 bg-black/40 rounded-xl my-1 border border-white/5">
                  {allUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        onSwitchUser(u.username);
                        setShowSettingsPopover(false);
                        setShowSwitchMenu(false);
                      }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs ${
                        u.id === currentUser.id
                          ? 'bg-indigo-600/30 text-indigo-200'
                          : 'text-neutral-300 hover:bg-white/5'
                      }`}
                    >
                      <span className="text-xs">{u.avatar}</span>
                      <span className="truncate">{u.displayName}</span>
                      {u.isLeader && (
                        <span className="text-[8px] font-mono text-amber-300 ml-auto">
                          LEADER
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="my-1 border-t border-white/5" />

            <button
              type="button"
              onClick={() => {
                setShowSettingsPopover(false);
                onLogout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out & Lock Station</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
