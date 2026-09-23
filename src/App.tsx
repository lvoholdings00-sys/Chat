/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  User,
  Channel,
  Message,
  CalendarEvent,
  NewsPost,
  ActiveTab,
  ChatTarget,
  Attachment,
  CustomStatus,
  AppTheme,
} from './types';
import { playMessagePing, playSendSwoosh, getMuted, setMuted } from './lib/sound';
import { WifiOff, CheckCircle2, RefreshCw } from 'lucide-react';
import { LoginScreen } from './components/LoginScreen';
import { NavigationRail } from './components/NavigationRail';
import { ChatPane } from './components/ChatPane';
import { CalendarView } from './components/CalendarView';
import { NewsView } from './components/NewsView';
import { AdminPanel } from './components/AdminPanel';
import { AvatarModal } from './components/AvatarModal';
import { ChannelModal } from './components/ChannelModal';
import { ManageChannelModal } from './components/ManageChannelModal';
import { LightboxModal } from './components/LightboxModal';
import { GifModal } from './components/GifModal';
import { PasswordChangeModal } from './components/PasswordChangeModal';
import { CommandPalette } from './components/CommandPalette';
import { CustomStatusModal } from './components/CustomStatusModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [newsPosts, setNewsPosts] = useState<NewsPost[]>([]);

  // Navigation & view states
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [activeTarget, setActiveTarget] = useState<ChatTarget | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Real-time tracking
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [typingMap, setTypingMap] = useState<Record<string, string[]>>({}); // targetId -> list of typing user displayNames
  const [isMutedState, setIsMutedState] = useState<boolean>(getMuted());

  // Modals state
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [isManageChannelOpen, setIsManageChannelOpen] = useState(false);
  const [lightboxAttachment, setLightboxAttachment] = useState<Attachment | null>(null);
  const [docPreviewAttachment, setDocPreviewAttachment] = useState<Attachment | null>(null);
  const [isGifModalOpen, setIsGifModalOpen] = useState(false);

  // Power user features modals
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [jumpHighlightMessageId, setJumpHighlightMessageId] = useState<string | null>(null);

  // User Color Palette Theme State
  const [currentTheme, setCurrentTheme] = useState<AppTheme>('midnight');

  // Reconnection toast state
  const [showReconnectedToast, setShowReconnectedToast] = useState(false);
  const wasDisconnectedRef = useRef(false);

  const socketRef = useRef<Socket | null>(null);

  // Load initial backend state
  const fetchInitialState = async () => {
    try {
      const res = await fetch('/api/initial-state');
      const data = await res.json();
      if (data.users) setUsers(data.users);
      if (data.channels) setChannels(data.channels);
      if (data.calendarEvents) setCalendarEvents(data.calendarEvents);
      if (data.newsPosts) setNewsPosts(data.newsPosts);

      // Default target to General channel if not selected
      if (!activeTarget && data.channels?.length > 0) {
        const general = data.channels.find((c: Channel) => c.id === 'chn_general') || data.channels[0];
        setActiveTarget({
          type: 'channel',
          id: general.id,
          name: general.name,
          icon: general.icon,
          channelType: general.type,
        });
      }
    } catch (err) {
      console.warn('Initial state fetch error:', err);
    }
  };

  useEffect(() => {
    fetchInitialState();

    // Check localStorage for saved session
    try {
      const savedUser = localStorage.getItem('lvo_session_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
      }
    } catch {}
  }, []);

  // Fetch messages when target changes or on boot
  useEffect(() => {
    if (!currentUser || !activeTarget) return;

    const fetchMessages = async () => {
      try {
        let url = '/api/messages?';
        if (activeTarget.type === 'channel') {
          url += `channelId=${encodeURIComponent(activeTarget.id)}`;
        } else {
          url += `dmUserId=${encodeURIComponent(activeTarget.id)}&currentUserId=${encodeURIComponent(
            currentUser.id
          )}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.warn('Failed to load messages:', err);
      }
    };

    fetchMessages();
  }, [activeTarget?.id, currentUser?.id]);

  // Socket.IO real-time connection and event bindings
  useEffect(() => {
    if (!currentUser) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsRealtimeConnected(false);
      return;
    }

    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsRealtimeConnected(true);
      socket.emit('auth', { userId: currentUser.id });

      // Join active channel if any
      if (activeTarget?.type === 'channel') {
        socket.emit('channel:join', { channelId: activeTarget.id });
      }
    });

    socket.on('disconnect', () => {
      setIsRealtimeConnected(false);
    });

    socket.on('users:presence', ({ onlineUserIds }: { onlineUserIds: string[] }) => {
      setOnlineUserIds(onlineUserIds || []);
    });

    socket.on('typing:status', (data: {
      targetId: string;
      isChannel: boolean;
      userId: string;
      userDisplayName: string;
      isTyping: boolean;
    }) => {
      setTypingMap((prev) => {
        const currentList = prev[data.targetId] || [];
        if (data.isTyping) {
          if (!currentList.includes(data.userDisplayName)) {
            return { ...prev, [data.targetId]: [...currentList, data.userDisplayName] };
          }
        } else {
          return {
            ...prev,
            [data.targetId]: currentList.filter((name) => name !== data.userDisplayName),
          };
        }
        return prev;
      });
    });

    socket.on('message:new', (msg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      // Play audio cue if message is from another user
      if (msg.senderId !== currentUser.id) {
        playMessagePing();
      }
    });

    // Pinned status update
    socket.on('message:pinned_updated', (data: {
      messageId: string;
      isPinned: boolean;
      pinnedBy?: string;
      pinnedAt?: string;
    }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? { ...m, isPinned: data.isPinned, pinnedBy: data.pinnedBy, pinnedAt: data.pinnedAt }
            : m
        )
      );
    });

    // Thread replies update
    socket.on('message:thread_updated', (data: {
      parentMessageId: string;
      replyCount: number;
      lastReplyAt: string;
      reply: Message;
    }) => {
      setMessages((prev) => {
        const hasReply = prev.some((m) => m.id === data.reply.id);
        const list = hasReply ? prev : [...prev, data.reply];
        return list.map((m) =>
          m.id === data.parentMessageId
            ? { ...m, replyCount: data.replyCount, lastReplyAt: data.lastReplyAt }
            : m
        );
      });
      if (data.reply.senderId !== currentUser.id) {
        playMessagePing();
      }
    });

    // Custom status update
    socket.on('user:status_updated', (data: { userId: string; customStatus?: CustomStatus }) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === data.userId ? { ...u, customStatus: data.customStatus } : u))
      );
      if (currentUser.id === data.userId) {
        setCurrentUser((prev) => (prev ? { ...prev, customStatus: data.customStatus } : null));
      }
      setActiveTarget((prev) =>
        prev?.type === 'direct' && prev.id === data.userId
          ? { ...prev, customStatus: data.customStatus }
          : prev
      );
    });

    socket.on('message:reaction_updated', ({ messageId, reactions }: { messageId: string; reactions: Record<string, string[]> }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      );
    });

    socket.on('messages:read_updated', (data: {
      userId: string;
      channelId?: string;
      dmUserId?: string;
      messageIds: string[];
      readAt: string;
    }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (data.messageIds && data.messageIds.includes(m.id)) {
            return {
              ...m,
              readBy: {
                ...(m.readBy || {}),
                [data.userId]: data.readAt,
              },
            };
          }
          return m;
        })
      );
    });

    socket.on('message:deleted', ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });

    socket.on('channel:created', (newCh: Channel) => {
      setChannels((prev) => (prev.some((c) => c.id === newCh.id) ? prev : [...prev, newCh]));
    });

    socket.on('channel:updated', (updCh: Channel) => {
      setChannels((prev) => prev.map((c) => (c.id === updCh.id ? updCh : c)));
      setActiveTarget((prev) => (prev?.id === updCh.id ? { ...prev, name: updCh.name, icon: updCh.icon } : prev));
    });

    socket.on('channel:deleted', ({ channelId }: { channelId: string }) => {
      setChannels((prev) => prev.filter((c) => c.id !== channelId));
      setActiveTarget((prev) => (prev?.id === channelId ? null : prev));
    });

    socket.on('calendar:created', (evt: CalendarEvent) => {
      setCalendarEvents((prev) => (prev.some((e) => e.id === evt.id) ? prev : [...prev, evt]));
    });

    socket.on('calendar:deleted', ({ id }: { id: string }) => {
      setCalendarEvents((prev) => prev.filter((e) => e.id !== id));
    });

    socket.on('news:created', (post: NewsPost) => {
      setNewsPosts((prev) => (prev.some((p) => p.id === post.id) ? prev : [post, ...prev]));
      playMessagePing();
    });

    socket.on('user:created', (newUser: User) => {
      setUsers((prev) => (prev.some((u) => u.id === newUser.id) ? prev : [...prev, newUser]));
    });

    socket.on('user:updated', (updUser: Partial<User> & { id: string }) => {
      setUsers((prev) => prev.map((u) => (u.id === updUser.id ? { ...u, ...updUser } : u)));
      if (currentUser.id === updUser.id) {
        setCurrentUser((prev) => (prev ? { ...prev, ...updUser } : null));
      }
    });

    socket.on('user:deleted', ({ userId }: { userId: string }) => {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      if (currentUser.id === userId) {
        handleLogout();
      }
    });

    socket.on('user:presence_status_updated', (data: { userId: string; status: 'online' | 'idle' | 'offline'; lastSeen?: string }) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === data.userId ? { ...u, status: data.status, lastSeen: data.lastSeen || u.lastSeen } : u))
      );
      if (currentUser.id === data.userId) {
        setCurrentUser((prev) => (prev ? { ...prev, status: data.status, lastSeen: data.lastSeen || prev.lastSeen } : null));
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser?.id]);

  // Reconnection tracking: show auto-dismissing confirmation when restored
  useEffect(() => {
    if (!currentUser) return;
    if (!isRealtimeConnected) {
      wasDisconnectedRef.current = true;
    } else if (isRealtimeConnected && wasDisconnectedRef.current) {
      wasDisconnectedRef.current = false;
      setShowReconnectedToast(true);
      const timer = window.setTimeout(() => setShowReconnectedToast(false), 2500);
      return () => window.clearTimeout(timer);
    }
  }, [isRealtimeConnected, currentUser?.id]);

  // Idle timer: updates user's status to 'Away' (idle) after 5 minutes of inactivity
  useEffect(() => {
    if (!currentUser) return;
    const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
    let timerId: number;
    let isAway = false;

    const onUserActivity = () => {
      window.clearTimeout(timerId);

      // If user was away/idle, return to online
      if (isAway) {
        isAway = false;
        socketRef.current?.emit('user:presence_status', {
          userId: currentUser.id,
          status: 'online',
        });
        setUsers((prev) =>
          prev.map((u) => (u.id === currentUser.id ? { ...u, status: 'online' } : u))
        );
        setCurrentUser((prev) => (prev ? { ...prev, status: 'online' } : null));
      }

      timerId = window.setTimeout(() => {
        isAway = true;
        socketRef.current?.emit('user:presence_status', {
          userId: currentUser.id,
          status: 'idle',
        });
        setUsers((prev) =>
          prev.map((u) => (u.id === currentUser.id ? { ...u, status: 'idle' } : u))
        );
        setCurrentUser((prev) => (prev ? { ...prev, status: 'idle' } : null));
      }, IDLE_TIMEOUT_MS);
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach((evt) =>
      window.addEventListener(evt, onUserActivity, { passive: true })
    );

    // Initial arming of timer
    timerId = window.setTimeout(() => {
      isAway = true;
      socketRef.current?.emit('user:presence_status', {
        userId: currentUser.id,
        status: 'idle',
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === currentUser.id ? { ...u, status: 'idle' } : u))
      );
      setCurrentUser((prev) => (prev ? { ...prev, status: 'idle' } : null));
    }, IDLE_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timerId);
      activityEvents.forEach((evt) => window.removeEventListener(evt, onUserActivity));
    };
  }, [currentUser?.id]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      // Escape: Close active overlays/modals
      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) {
          setIsCommandPaletteOpen(false);
          return;
        }
        if (isStatusModalOpen) {
          setIsStatusModalOpen(false);
          return;
        }
        if (isShortcutsModalOpen) {
          setIsShortcutsModalOpen(false);
          return;
        }
        if (isAvatarModalOpen) {
          setIsAvatarModalOpen(false);
          return;
        }
        if (isChannelModalOpen) {
          setIsChannelModalOpen(false);
          return;
        }
        if (isManageChannelOpen) {
          setIsManageChannelOpen(false);
          return;
        }
        if (isAdminOpen) {
          setIsAdminOpen(false);
          return;
        }
      }

      // Cmd+K: Command Palette / Channel Switcher
      if (cmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Cmd+/: Shortcuts Modal
      if (cmdOrCtrl && e.key === '/') {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }

      // Cmd+Shift+C: Calendar View
      if (cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setActiveTab('calendar');
        setMobileShowChat(false);
        return;
      }

      // Cmd+Shift+N: News View
      if (cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setActiveTab('news');
        setMobileShowChat(false);
        return;
      }

      // Cmd+Shift+M: Chat View
      if (cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setActiveTab('chat');
        return;
      }

      // Cmd+Shift+S: Custom Status Modal
      if (cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setIsStatusModalOpen(true);
        return;
      }

      // Cmd+Shift+A: Gatekeeper Admin Panel
      if (cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'a') {
        if (currentUser?.isAdmin) {
          e.preventDefault();
          setIsAdminOpen((prev) => !prev);
        }
        return;
      }

      // Cmd+F or Cmd+Shift+F: Global Message History Search
      if (cmdOrCtrl && (e.key.toLowerCase() === 'f' || (e.shiftKey && e.key.toLowerCase() === 'f'))) {
        e.preventDefault();
        setIsGlobalSearchOpen(true);
        return;
      }

      // '?' outside inputs: Show Shortcuts Modal
      if (!isInput && e.key === '?' && !cmdOrCtrl) {
        e.preventDefault();
        setIsShortcutsModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentUser?.isAdmin,
    isCommandPaletteOpen,
    isStatusModalOpen,
    isShortcutsModalOpen,
    isGlobalSearchOpen,
    isAvatarModalOpen,
    isChannelModalOpen,
    isManageChannelOpen,
    isAdminOpen,
  ]);

  // Synchronize theme with currentUser or localStorage
  useEffect(() => {
    if (currentUser?.theme) {
      setCurrentTheme(currentUser.theme);
      document.documentElement.setAttribute('data-theme', currentUser.theme);
    } else {
      const saved = localStorage.getItem('lvo_theme') as AppTheme | null;
      if (saved) {
        setCurrentTheme(saved);
        document.documentElement.setAttribute('data-theme', saved);
      } else {
        document.documentElement.setAttribute('data-theme', 'midnight');
      }
    }
  }, [currentUser?.theme]);

  const handleSelectTheme = async (theme: AppTheme) => {
    setCurrentTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('lvo_theme', theme);
    } catch {}

    if (currentUser) {
      try {
        await fetch('/api/profile/theme', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, theme }),
        });
        setCurrentUser((prev) => (prev ? { ...prev, theme } : null));
      } catch (err) {
        console.warn('Failed to persist theme:', err);
      }
    }
  };

  // Jump to message from Global Search or history
  const handleJumpToMessage = (target: ChatTarget, messageId: string) => {
    handleSelectTarget(target);
    setActiveTab('chat');
    setMobileShowChat(true);
    setJumpHighlightMessageId(messageId);
  };

  // Handle switching channels
  const handleSelectTarget = (target: ChatTarget) => {
    if (activeTarget?.type === 'channel' && socketRef.current) {
      socketRef.current.emit('channel:leave', { channelId: activeTarget.id });
    }
    setActiveTarget(target);
    setMobileShowChat(true);

    if (target.type === 'channel' && socketRef.current) {
      socketRef.current.emit('channel:join', { channelId: target.id });
    }
  };

  // Login handler
  const handleLogin = async (username: string, pass: string) => {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pass }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to authenticate');

    setCurrentUser(data.user);
    try {
      localStorage.setItem('lvo_session_user', JSON.stringify(data.user));
    } catch {}
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('lvo_session_user');
    } catch {}
  };

  const handleSwitchUser = async (uname: string) => {
    try {
      await handleLogin(uname, 'Password123!');
    } catch (err) {
      console.warn('Switch user error:', err);
    }
  };

  // Password change completion
  const handleSaveNewPassword = async (newPassword: string) => {
    if (!currentUser) return;
    const res = await fetch('/api/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, newPassword }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Password update failed');
    }
    setCurrentUser((prev) => (prev ? { ...prev, needsPasswordChange: false } : null));
  };

  // Update profile avatar
  const handleSaveAvatar = async (newAvatar: string) => {
    if (!currentUser) return;
    const res = await fetch('/api/profile/avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, avatar: newAvatar }),
    });
    if (!res.ok) throw new Error('Avatar update failed');
    setCurrentUser((prev) => (prev ? { ...prev, avatar: newAvatar } : null));
  };

  // Update custom status
  const handleSaveCustomStatus = async (status?: CustomStatus) => {
    if (!currentUser) return;

    if (socketRef.current && isRealtimeConnected) {
      socketRef.current.emit('user:status', {
        userId: currentUser.id,
        customStatus: status,
      });
    }

    // Direct REST sync
    try {
      const res = await fetch('/api/profile/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, customStatus: status }),
      });
      const data = await res.json();
      if (data.customStatus !== undefined) {
        setCurrentUser((prev) => (prev ? { ...prev, customStatus: data.customStatus } : null));
        setUsers((prev) =>
          prev.map((u) => (u.id === currentUser.id ? { ...u, customStatus: data.customStatus } : u))
        );
      }
    } catch (err) {
      console.warn('Status update sync error:', err);
    }
  };

  // Send message
  const handleSendMessage = async (
    text: string,
    attachments?: Attachment[],
    parentMessageId?: string
  ) => {
    if (!currentUser || !activeTarget) return;
    playSendSwoosh();

    const payload = {
      channelId: activeTarget.type === 'channel' ? activeTarget.id : undefined,
      recipientId: activeTarget.type === 'direct' ? activeTarget.id : undefined,
      senderId: currentUser.id,
      text,
      attachments,
      parentMessageId,
    };

    if (socketRef.current && isRealtimeConnected) {
      socketRef.current.emit('message:send', payload);
    } else {
      // Fallback REST
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
  };

  // Send nested thread reply
  const handleSendThreadReply = async (
    parentMessageId: string,
    text: string,
    attachments?: Attachment[]
  ) => {
    await handleSendMessage(text, attachments, parentMessageId);
  };

  // Mark messages as read
  const handleMarkAsRead = async (messageIds: string[]) => {
    if (!currentUser || !messageIds || messageIds.length === 0) return;

    const now = new Date().toISOString();
    // Optimistic UI update
    setMessages((prev) =>
      prev.map((m) => {
        if (messageIds.includes(m.id)) {
          return {
            ...m,
            readBy: {
              ...(m.readBy || {}),
              [currentUser.id]: now,
            },
          };
        }
        return m;
      })
    );

    const isChannel = activeTarget?.type === 'channel';
    const payload = {
      userId: currentUser.id,
      channelId: isChannel ? activeTarget?.id : undefined,
      dmUserId: !isChannel && activeTarget?.type === 'direct' ? activeTarget?.id : undefined,
      messageIds,
    };

    if (socketRef.current && isRealtimeConnected) {
      socketRef.current.emit('messages:read', payload);
    } else {
      try {
        await fetch('/api/messages/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.warn('Failed to sync read status:', err);
      }
    }
  };

  // Pin message
  const handlePinMessage = async (messageId: string, isPinned: boolean) => {
    if (!currentUser) return;

    // Optimistic UI update
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              isPinned,
              pinnedBy: isPinned ? currentUser.id : undefined,
              pinnedAt: isPinned ? new Date().toISOString() : undefined,
            }
          : m
      )
    );

    if (socketRef.current && isRealtimeConnected) {
      socketRef.current.emit('message:pin', {
        messageId,
        isPinned,
        userId: currentUser.id,
      });
    } else {
      await fetch(`/api/messages/${messageId}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned, userId: currentUser.id }),
      });
    }
  };

  // React to message
  const handleReactMessage = (messageId: string, emoji: string) => {
    if (!currentUser) return;
    if (socketRef.current) {
      socketRef.current.emit('message:react', {
        messageId,
        emoji,
        userId: currentUser.id,
      });
    }
  };

  // Delete message
  const handleDeleteMessage = (messageId: string) => {
    if (!currentUser) return;
    if (socketRef.current) {
      socketRef.current.emit('message:delete', {
        messageId,
        userId: currentUser.id,
      });
    }
  };

  // Typing emitter
  const handleSendTyping = (isTyping: boolean) => {
    if (!currentUser || !activeTarget || !socketRef.current) return;
    socketRef.current.emit(isTyping ? 'typing:start' : 'typing:stop', {
      targetId: activeTarget.id,
      isChannel: activeTarget.type === 'channel',
      userDisplayName: currentUser.displayName,
      userId: currentUser.id,
    });
  };

  // Channel Creation
  const handleCreateChannel = async (data: {
    name: string;
    icon: string;
    type: 'group' | 'announcement';
    memberIds: string[];
    description: string;
  }) => {
    if (!currentUser) return;
    const res = await fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, createdBy: currentUser.id }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to create channel');
    setActiveTarget({
      type: 'channel',
      id: result.channel.id,
      name: result.channel.name,
      icon: result.channel.icon,
      channelType: result.channel.type,
    });
  };

  // Channel Update
  const handleUpdateChannel = async (channelId: string, updates: Partial<Channel>) => {
    const res = await fetch(`/api/channels/${channelId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Update failed');
    }
  };

  // Channel Delete
  const handleDeleteChannel = async (channelId: string) => {
    const res = await fetch(`/api/channels/${channelId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Delete failed');
    }
  };

  // Calendar Event Add
  const handleAddCalendarEvent = async (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => {
    const res = await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to add event');
    }
  };

  // Calendar Event Delete
  const handleDeleteCalendarEvent = async (id: string) => {
    const res = await fetch(`/api/calendar/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete event');
  };

  // News post
  const handlePostNews = async (data: { title: string; body: string; isPinned: boolean }) => {
    if (!currentUser) return;
    const res = await fetch('/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        authorId: currentUser.id,
        authorName: currentUser.displayName,
      }),
    });
    if (!res.ok) {
      const respData = await res.json();
      throw new Error(respData.error || 'Failed to publish news');
    }
  };

  const handleToggleMute = () => {
    const next = !isMutedState;
    setIsMutedState(next);
    setMuted(next);
  };

  // If not authenticated, show login
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Active channel for manage modal
  const activeChannel =
    activeTarget?.type === 'channel'
      ? channels.find((c) => c.id === activeTarget.id) || null
      : null;

  // Active typing indicator list for current target
  const activeTypingUsers = activeTarget ? typingMap[activeTarget.id] || [] : [];

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#0d0e12] font-['Plus_Jakarta_Sans',sans-serif] text-neutral-100 antialiased relative">
      {/* Subtle WebSocket Reconnecting / Reconnected Toast */}
      {currentUser && !isRealtimeConnected && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#181a24]/90 border border-amber-500/40 text-amber-300 text-xs font-mono backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-top-3">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
          <span>WebSocket disconnected — reconnecting to live comms...</span>
        </div>
      )}

      {currentUser && showReconnectedToast && isRealtimeConnected && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-[#181a24]/90 border border-emerald-500/40 text-emerald-300 text-xs font-mono backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Live telemetry connection restored</span>
        </div>
      )}

      {/* Admin Panel Full View */}
      {isAdminOpen ? (
        <AdminPanel
          currentUser={currentUser}
          users={users}
          channels={channels}
          onClose={() => setIsAdminOpen(false)}
          onOpenCreateChannelModal={() => setIsChannelModalOpen(true)}
          onDeleteChannel={handleDeleteChannel}
          onRefreshUsers={fetchInitialState}
        />
      ) : (
        <div className="flex-1 flex overflow-hidden w-full h-full relative">
          {/* Left Navigation Rail (Hidden on mobile if chat is open) */}
          <div className={`${mobileShowChat ? 'hidden md:flex' : 'flex'} h-full shrink-0`}>
            <NavigationRail
              currentUser={currentUser}
              allUsers={users}
              channels={channels}
              messages={messages}
              activeTab={activeTab}
              setActiveTab={(tab) => {
                setActiveTab(tab);
                setMobileShowChat(false);
              }}
              activeChatTarget={activeTarget}
              onSelectTarget={handleSelectTarget}
              onOpenAvatarModal={() => setIsAvatarModalOpen(true)}
              onOpenCreateChannelModal={() => setIsChannelModalOpen(true)}
              onOpenAdminPanel={() => setIsAdminOpen(true)}
              onOpenStatusModal={() => setIsStatusModalOpen(true)}
              onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
              onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
              onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
              onJumpToMessage={handleJumpToMessage}
              currentTheme={currentTheme}
              onSelectTheme={handleSelectTheme}
              onLogout={handleLogout}
              onSwitchUser={handleSwitchUser}
              onlineUserIds={onlineUserIds}
              isRealtimeConnected={isRealtimeConnected}
              isMuted={isMutedState}
              onToggleMute={handleToggleMute}
            />
          </div>

          {/* Right Pane (Chat / Calendar / News) */}
          <div
            className={`flex-1 flex flex-col h-full overflow-hidden ${
              !mobileShowChat ? 'hidden md:flex' : 'flex'
            }`}
          >
            {activeTab === 'chat' && (
              <ChatPane
                currentUser={currentUser}
                allUsers={users}
                activeTarget={activeTarget}
                messages={messages}
                onSendMessage={handleSendMessage}
                onSendThreadReply={handleSendThreadReply}
                onPinMessage={handlePinMessage}
                onReactMessage={handleReactMessage}
                onDeleteMessage={handleDeleteMessage}
                onOpenManageChannel={() => setIsManageChannelOpen(true)}
                onOpenGifModal={() => setIsGifModalOpen(true)}
                onPreviewAttachment={(att) => setLightboxAttachment(att)}
                onPreviewDocument={(att) => setDocPreviewAttachment(att)}
                onBackMobile={() => setMobileShowChat(false)}
                typingUsers={activeTypingUsers}
                onSendTyping={handleSendTyping}
                onMarkAsRead={handleMarkAsRead}
                isMuted={isMutedState}
                onToggleMute={handleToggleMute}
                highlightMessageId={jumpHighlightMessageId}
                onClearHighlightMessageId={() => setJumpHighlightMessageId(null)}
              />
            )}

            {activeTab === 'calendar' && (
              <CalendarView
                events={calendarEvents}
                currentUser={currentUser}
                onAddEvent={handleAddCalendarEvent}
                onDeleteEvent={handleDeleteCalendarEvent}
                onBackMobile={() => setMobileShowChat(false)}
              />
            )}

            {activeTab === 'news' && (
              <NewsView
                posts={newsPosts}
                currentUser={currentUser}
                onPostNews={handlePostNews}
                onBackMobile={() => setMobileShowChat(false)}
              />
            )}
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* Forced Password Change on First Login */}
      {currentUser.needsPasswordChange && (
        <PasswordChangeModal
          isOpen={true}
          onSavePassword={handleSaveNewPassword}
        />
      )}

      {/* Avatar / Identity Modal */}
      <AvatarModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentAvatar={currentUser.avatar}
        onSaveAvatar={handleSaveAvatar}
      />

      {/* Create Channel Modal */}
      <ChannelModal
        isOpen={isChannelModalOpen}
        onClose={() => setIsChannelModalOpen(false)}
        users={users}
        currentUserId={currentUser.id}
        onCreateChannel={handleCreateChannel}
      />

      {/* Manage Channel Modal */}
      {activeChannel && (
        <ManageChannelModal
          isOpen={isManageChannelOpen}
          onClose={() => setIsManageChannelOpen(false)}
          channel={activeChannel}
          allUsers={users}
          currentUserId={currentUser.id}
          isLeaderOrAdmin={currentUser.isAdmin || currentUser.isLeader}
          onUpdateChannel={handleUpdateChannel}
          onDeleteChannel={handleDeleteChannel}
        />
      )}

      {/* Media Lightbox */}
      <LightboxModal
        attachment={lightboxAttachment}
        onClose={() => setLightboxAttachment(null)}
      />

      {/* GIF Picker Modal */}
      <GifModal
        isOpen={isGifModalOpen}
        onClose={() => setIsGifModalOpen(false)}
        onSelectGif={(gifUrl) => {
          handleSendMessage('', [
            {
              id: `gif_${Date.now()}`,
              name: 'Tactical Reaction GIF',
              type: 'image',
              url: gifUrl,
            },
          ]);
        }}
      />

      {/* Command Palette / Quick Channel Switcher (⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        currentUser={currentUser}
        allUsers={users}
        channels={channels}
        onlineUserIds={onlineUserIds}
        onSelectTarget={(target) => {
          handleSelectTarget(target);
          setActiveTab('chat');
        }}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setMobileShowChat(false);
        }}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenStatusModal={() => setIsStatusModalOpen(true)}
        onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
      />

      {/* Custom Status Modal (⌘⇧S) */}
      <CustomStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        currentStatus={currentUser?.customStatus}
        onSaveStatus={handleSaveCustomStatus}
      />

      {/* Keyboard Shortcuts Modal (⌘/) */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* Global Message History Search Modal (⌘F) */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        currentUser={currentUser}
        channels={channels}
        allUsers={users}
        onJumpToMessage={handleJumpToMessage}
      />

      {/* Document & PDF In-App Direct Preview Modal */}
      <DocumentPreviewModal
        attachment={docPreviewAttachment}
        onClose={() => setDocPreviewAttachment(null)}
      />
    </div>
  );
}
