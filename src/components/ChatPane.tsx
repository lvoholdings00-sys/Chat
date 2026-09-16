import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  Bell,
  BellOff,
  Settings,
  Paperclip,
  Smile,
  Send,
  Heart,
  Globe,
  Trash2,
  Mic,
  MicOff,
  Square,
  FileText,
  Download,
  Play,
  Pause,
  X,
  Sparkles,
  Pin,
  PinOff,
  MessageSquare,
  CornerDownRight,
  ExternalLink,
  Check,
  CheckCheck,
} from 'lucide-react';
import type { User, Channel, Message, ChatTarget, Attachment } from '../types';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';

interface ChatPaneProps {
  currentUser: User;
  allUsers: User[];
  activeTarget: ChatTarget | null;
  messages: Message[];
  onSendMessage: (text: string, attachments?: Attachment[]) => Promise<void>;
  onSendThreadReply: (parentMessageId: string, text: string, attachments?: Attachment[]) => Promise<void>;
  onPinMessage: (messageId: string, isPinned: boolean) => void;
  onReactMessage: (messageId: string, emoji: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onOpenManageChannel: () => void;
  onOpenGifModal: () => void;
  onPreviewAttachment: (att: Attachment) => void;
  onBackMobile?: () => void;
  typingUsers: string[];
  onSendTyping: (isTyping: boolean) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onMarkAsRead?: (messageIds: string[]) => void;
}

const COMMON_REACTIONS = ['❤️', '👍', '🔥', '💎', '🫡', '⚡', '😂', '🎯'];

export const ChatPane: React.FC<ChatPaneProps> = ({
  currentUser,
  allUsers,
  activeTarget,
  messages,
  onSendMessage,
  onSendThreadReply,
  onPinMessage,
  onReactMessage,
  onDeleteMessage,
  onOpenManageChannel,
  onOpenGifModal,
  onPreviewAttachment,
  onBackMobile,
  typingUsers,
  onSendTyping,
  isMuted,
  onToggleMute,
  onMarkAsRead,
}) => {
  const [inputText, setInputText] = useState('');
  const [stagedAttachments, setStagedAttachments] = useState<Attachment[]>([]);
  const [activeReactionPickerMsgId, setActiveReactionPickerMsgId] = useState<string | null>(null);
  const [translatingMsgIds, setTranslatingMsgIds] = useState<Set<string>>(new Set());
  const [translations, setTranslations] = useState<Record<string, string>>({});

  // Pinned & Thread Drawers
  const [showPinnedDrawer, setShowPinnedDrawer] = useState(false);
  const [activeThreadMessageId, setActiveThreadMessageId] = useState<string | null>(null);
  const [threadInputText, setThreadInputText] = useState('');
  const [threadAttachments, setThreadAttachments] = useState<Attachment[]>([]);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);

  // Draft local storage tracking
  const prevTargetRef = useRef<ChatTarget | null>(null);
  const inputTextRef = useRef<string>('');
  const [isDraftRestored, setIsDraftRestored] = useState(false);

  // Voice recording state & visualizer
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [liveAudioLevels, setLiveAudioLevels] = useState<number[]>([15, 25, 35, 45, 35, 25, 15]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const recordingDurationRef = useRef<number>(0);
  const sendImmediatelyRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const threadFileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Filter messages for current active target
  const targetMessages = messages.filter((m) => {
    if (!activeTarget) return false;
    if (activeTarget.type === 'channel') {
      return m.channelId === activeTarget.id;
    } else {
      return (
        (m.senderId === currentUser.id && m.recipientId === activeTarget.id) ||
        (m.senderId === activeTarget.id && m.recipientId === currentUser.id)
      );
    }
  });

  // Root messages (not thread replies)
  const rootMessages = targetMessages.filter((m) => !m.parentMessageId);

  // Pinned messages for this channel / direct message
  const pinnedMessages = targetMessages.filter((m) => m.isPinned);
  const latestPinnedMessage = pinnedMessages[pinnedMessages.length - 1];

  // Active thread message and its replies
  const activeThreadParent = activeThreadMessageId
    ? messages.find((m) => m.id === activeThreadMessageId) || null
    : null;

  const threadReplies = activeThreadParent
    ? messages
        .filter((m) => m.parentMessageId === activeThreadParent.id)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    : [];

  // Keep inputTextRef updated
  useEffect(() => {
    inputTextRef.current = inputText;
  }, [inputText]);

  // Handle local storage draft preservation across channel/DM switches
  useEffect(() => {
    // 1. Save draft for previous target if user typed something
    const prevTarget = prevTargetRef.current;
    if (prevTarget) {
      const prevKey = `lvo_draft_${currentUser.id}_${prevTarget.type}_${prevTarget.id}`;
      const currentVal = inputTextRef.current;
      try {
        if (currentVal && currentVal.trim()) {
          localStorage.setItem(prevKey, currentVal);
        } else {
          localStorage.removeItem(prevKey);
        }
      } catch (err) {
        console.warn('Unable to persist message draft:', err);
      }
    }

    // 2. Load draft for newly activated target
    if (activeTarget) {
      const newKey = `lvo_draft_${currentUser.id}_${activeTarget.type}_${activeTarget.id}`;
      try {
        const savedDraft = localStorage.getItem(newKey) || '';
        setInputText(savedDraft);
        inputTextRef.current = savedDraft;
        setIsDraftRestored(Boolean(savedDraft && savedDraft.trim()));
      } catch (err) {
        setInputText('');
        inputTextRef.current = '';
        setIsDraftRestored(false);
      }
    } else {
      setInputText('');
      inputTextRef.current = '';
      setIsDraftRestored(false);
    }

    prevTargetRef.current = activeTarget;
  }, [activeTarget?.id, activeTarget?.type, currentUser.id]);

  // Read receipts: Automatically mark unread messages as read when viewing target
  useEffect(() => {
    if (!activeTarget || !onMarkAsRead) return;

    const unreadMessages = targetMessages.filter(
      (m) => m.senderId !== currentUser.id && (!m.readBy || !m.readBy[currentUser.id])
    );

    if (unreadMessages.length > 0) {
      const unreadIds = unreadMessages.map((m) => m.id);
      onMarkAsRead(unreadIds);
    }
  }, [targetMessages.length, activeTarget?.id, activeTarget?.type, currentUser.id, onMarkAsRead]);

  // Auto scroll to bottom of main chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [rootMessages.length, stagedAttachments.length, typingUsers.length]);

  // Auto scroll thread drawer on new replies
  useEffect(() => {
    if (activeThreadParent) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [threadReplies.length, activeThreadMessageId]);

  // Handle typing debounce & draft saving
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);
    inputTextRef.current = val;
    setIsDraftRestored(false);

    if (activeTarget) {
      const key = `lvo_draft_${currentUser.id}_${activeTarget.type}_${activeTarget.id}`;
      try {
        if (val.trim()) {
          localStorage.setItem(key, val);
        } else {
          localStorage.removeItem(key);
        }
      } catch (err) {}
    }

    onSendTyping(true);

    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      onSendTyping(false);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() && stagedAttachments.length === 0) return;
    const textToSend = inputText;
    const attToSend = stagedAttachments;

    // Clear composer & stored draft
    setInputText('');
    inputTextRef.current = '';
    setIsDraftRestored(false);
    if (activeTarget) {
      try {
        localStorage.removeItem(`lvo_draft_${currentUser.id}_${activeTarget.type}_${activeTarget.id}`);
      } catch (err) {}
    }

    setStagedAttachments([]);
    onSendTyping(false);

    try {
      await onSendMessage(textToSend, attToSend);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Handle Thread reply send
  const handleSendThread = async () => {
    if (!activeThreadParent) return;
    if (!threadInputText.trim() && threadAttachments.length === 0) return;

    const text = threadInputText;
    const atts = threadAttachments;
    setThreadInputText('');
    setThreadAttachments([]);

    try {
      await onSendThreadReply(activeThreadParent.id, text, atts);
    } catch (err) {
      console.error('Failed to send thread reply:', err);
    }
  };

  const handleThreadKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendThread();
    }
  };

  // Jump to message in main stream and highlight
  const handleJumpToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMsgId(messageId);
      setTimeout(() => setHighlightedMsgId(null), 2500);
    }
  };

  // Handle file attachment selection for main composer
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      let type: Attachment['type'] = 'file';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';

      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        const newAtt: Attachment = {
          id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          type,
          url,
          size: file.size,
        };
        setStagedAttachments((prev) => [...prev, newAtt]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // Handle file attachment for thread composer
  const handleThreadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      let type: Attachment['type'] = 'file';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';

      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        const newAtt: Attachment = {
          id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          type,
          url,
          size: file.size,
        };
        setThreadAttachments((prev) => [...prev, newAtt]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // Voice recording cleanup helper
  const cleanupAudioResources = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudioResources();
      if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
    };
  }, []);

  // Voice recording start
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      sendImmediatelyRef.current = false;
      startTimeRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalMime = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: finalMime });
        const elapsedSec = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
        recordingDurationRef.current = elapsedSec;

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          const newAtt: Attachment = {
            id: `voice_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: `Voice Clip (${elapsedSec}s)`,
            type: 'audio',
            url: base64Audio,
            duration: elapsedSec,
            size: audioBlob.size,
          };

          if (sendImmediatelyRef.current) {
            onSendMessage('', [newAtt]).catch((err) =>
              console.error('Failed to dispatch voice transmission:', err)
            );
          } else {
            setStagedAttachments((prev) => [...prev, newAtt]);
          }
        };
        reader.readAsDataURL(audioBlob);

        cleanupAudioResources();
      };

      // Set up real-time audio visualizer using AudioContext & AnalyserNode
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioContextRef.current = ctx;
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          analyserRef.current = analyser;
          const source = ctx.createMediaStreamSource(stream);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateLevels = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            const bars: number[] = [];
            for (let i = 0; i < 7; i++) {
              const bin = Math.floor((i / 7) * (dataArray.length / 2));
              const normalized = Math.max(16, Math.min(100, Math.round((dataArray[bin] / 255) * 100)));
              bars.push(normalized);
            }
            setLiveAudioLevels(bars);
            animFrameRef.current = requestAnimationFrame(updateLevels);
          };
          animFrameRef.current = requestAnimationFrame(updateLevels);
        }
      } catch (err) {
        console.warn('Live audio visualization unavailable:', err);
      }

      recorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);

      if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone access denied or error starting recorder:', err);
    }
  };

  const stopRecording = (andSendImmediately = false) => {
    if (mediaRecorderRef.current && isRecording) {
      sendImmediatelyRef.current = andSendImmediately;
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecording(false);
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch (err) {
        console.error('Error stopping recorder:', err);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      audioChunksRef.current = [];
      sendImmediatelyRef.current = false;
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecording(false);
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch (err) {
        console.error('Error cancelling recorder:', err);
      }
      cleanupAudioResources();
    }
  };

  // AI Translation action
  const handleTranslate = async (msg: Message) => {
    if (!msg.text) return;
    if (translations[msg.id]) {
      setTranslations((prev) => {
        const next = { ...prev };
        delete next[msg.id];
        return next;
      });
      return;
    }

    setTranslatingMsgIds((prev) => new Set(prev).add(msg.id));
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg.text, targetLang: 'Spanish' }),
      });
      const data = await res.json();
      if (data.translation) {
        setTranslations((prev) => ({ ...prev, [msg.id]: data.translation }));
      }
    } catch (err) {
      console.error('Translation failed:', err);
    } finally {
      setTranslatingMsgIds((prev) => {
        const next = new Set(prev);
        next.delete(msg.id);
        return next;
      });
    }
  };

  if (!activeTarget) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0d0e13] p-8 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl mb-4 text-indigo-400">
          💬
        </div>
        <h2 className="font-['Fraunces'] text-xl font-semibold text-white tracking-wide">
          Select a Communications Channel
        </h2>
        <p className="text-xs text-neutral-400 mt-1 max-w-sm leading-relaxed">
          Pick an encrypted channel or team member from the roster on the left to begin real-time messaging.
        </p>
      </div>
    );
  }

  const isAnnouncementChannel =
    activeTarget.type === 'channel' && activeTarget.channelType === 'announcement';
  const canPost = !isAnnouncementChannel || currentUser.isAdmin || currentUser.isLeader;

  // Find latest target info from allUsers if direct message
  const directTargetUser =
    activeTarget.type === 'direct' ? allUsers.find((u) => u.id === activeTarget.id) : null;
  const currentTargetCustomStatus = directTargetUser?.customStatus || activeTarget.customStatus;

  return (
    <div className="flex-1 flex bg-[#0f1016] h-full overflow-hidden relative">
      {/* Primary Chat Column */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Chat Header */}
        <div className="h-16 px-4 bg-[#14161f] border-b border-white/10 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            {onBackMobile && (
              <button
                onClick={onBackMobile}
                className="md:hidden p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10"
                title="Back"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-white/15 flex items-center justify-center text-lg overflow-hidden shadow-sm">
                {activeTarget.avatar?.startsWith('data:') ? (
                  <img
                    src={activeTarget.avatar}
                    alt={activeTarget.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{activeTarget.icon || activeTarget.avatar || '💬'}</span>
                )}
              </div>
              {activeTarget.type === 'direct' && (
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#14161f] ${
                    activeTarget.status === 'online' ? 'bg-emerald-400' : 'bg-neutral-600'
                  }`}
                />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-semibold text-white truncate">
                  {activeTarget.type === 'channel' ? `#${activeTarget.name}` : activeTarget.name}
                </h2>
                {activeTarget.isLeader && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold shrink-0">
                    LEADER
                  </span>
                )}

                {/* Recipient Custom Status in Direct Message Header */}
                {activeTarget.type === 'direct' && currentTargetCustomStatus?.text && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10.5px] font-mono max-w-[220px] truncate shrink-0"
                    title={currentTargetCustomStatus.text}
                  >
                    <span>{currentTargetCustomStatus.emoji || '💬'}</span>
                    <span className="truncate">{currentTargetCustomStatus.text}</span>
                  </span>
                )}
              </div>

              <p className="text-[11px] text-neutral-400 truncate">
                {typingUsers.length > 0
                  ? `${typingUsers.join(', ')} is typing…`
                  : activeTarget.type === 'channel'
                  ? isAnnouncementChannel
                    ? 'Official Directive Broadcast (Read-Only)'
                    : 'Operational Group Comms'
                  : activeTarget.status === 'online'
                  ? 'Active on Secure Line'
                  : 'Offline'}
              </p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Pinned Messages Trigger */}
            <button
              type="button"
              onClick={() => {
                setShowPinnedDrawer((prev) => !prev);
                if (!showPinnedDrawer) setActiveThreadMessageId(null);
              }}
              className={`relative p-2 rounded-xl border transition-colors flex items-center gap-1.5 ${
                showPinnedDrawer
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'text-neutral-400 hover:text-white border-transparent hover:bg-white/10'
              }`}
              title="View Pinned Transmissions"
            >
              <Pin className={`w-4 h-4 ${pinnedMessages.length > 0 ? 'text-amber-400' : ''}`} />
              {pinnedMessages.length > 0 && (
                <span className="text-[10px] font-mono font-bold bg-amber-400 text-black px-1.5 py-0.2 rounded-full">
                  {pinnedMessages.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              title={isMuted ? 'Unmute Audio Pings' : 'Mute Audio Pings'}
            >
              {isMuted ? <BellOff className="w-4 h-4 text-neutral-500" /> : <Bell className="w-4 h-4 text-indigo-400" />}
            </button>

            {activeTarget.type === 'channel' && (
              <button
                type="button"
                onClick={onOpenManageChannel}
                className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                title="Channel Details & Roster"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Dedicated Pinned Messages Top Banner */}
        {pinnedMessages.length > 0 && latestPinnedMessage && (
          <div className="bg-[#1a1715] border-b border-amber-500/20 px-4 py-2 flex items-center justify-between gap-3 text-xs shrink-0 z-10 animate-in fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1 rounded-lg bg-amber-500/15 text-amber-400 shrink-0">
                <Pin className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex items-center gap-2 truncate">
                <span className="font-semibold text-amber-300 font-mono text-[11px] uppercase tracking-wider shrink-0">
                  Pinned Dispatch:
                </span>
                <span className="text-neutral-300 truncate">
                  {latestPinnedMessage.text || 'Shared attachment transmission'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleJumpToMessage(latestPinnedMessage.id)}
                className="text-[11px] font-mono text-amber-400 hover:text-amber-300 underline underline-offset-2"
              >
                Jump
              </button>
              <span className="text-neutral-600">|</span>
              <button
                type="button"
                onClick={() => {
                  setShowPinnedDrawer(true);
                  setActiveThreadMessageId(null);
                }}
                className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-mono font-medium transition-colors"
              >
                All ({pinnedMessages.length})
              </button>
            </div>
          </div>
        )}

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3.5">
          {rootMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 select-none">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl mb-3 text-neutral-400">
                ⚡
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                Transmission Channel Initialized
              </p>
              <p className="text-[11px] text-neutral-500 mt-1 max-w-xs">
                No previous transmissions logged. Send a secure dispatch to open communication.
              </p>
            </div>
          ) : (
            rootMessages.map((msg, index) => {
              const author = allUsers.find((u) => u.id === msg.senderId);
              const isMe = msg.senderId === currentUser.id;
              const prevMsg = rootMessages[index - 1];
              const isSameSender = prevMsg && prevMsg.senderId === msg.senderId;

              // Timestamp formatting
              const timeFormatted = new Date(msg.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;
              const translatedText = translations[msg.id];
              const isTranslating = translatingMsgIds.has(msg.id);
              const isHighlighted = highlightedMsgId === msg.id;

              return (
                <div
                  key={msg.id}
                  id={`msg-${msg.id}`}
                  className={`group relative flex items-start gap-3 p-2 rounded-2xl transition-all ${
                    isHighlighted
                      ? 'bg-amber-500/15 ring-1 ring-amber-500/40'
                      : 'hover:bg-white/[0.02]'
                  } ${isSameSender ? 'pt-0.5' : 'pt-2'}`}
                >
                  {/* Author Avatar */}
                  <div className="shrink-0 w-8">
                    {!isSameSender && (
                      <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-white/10 flex items-center justify-center text-sm overflow-hidden shadow-sm">
                        {author?.avatar?.startsWith('data:') ? (
                          <img src={author.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          author?.avatar || '👤'
                        )}
                      </div>
                    )}
                  </div>

                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    {/* Read receipt computation */}
                    {(() => {
                      let isReadByOthers = false;
                      let readReceiptTooltip = 'Delivered';

                      if (isMe) {
                        if (activeTarget?.type === 'direct' || msg.recipientId) {
                          const peerId = msg.recipientId || (activeTarget?.type === 'direct' ? activeTarget.id : null);
                          const peerUser = allUsers.find((u) => u.id === peerId);
                          if (peerId && msg.readBy && msg.readBy[peerId]) {
                            isReadByOthers = true;
                            const readTime = new Date(msg.readBy[peerId]).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            });
                            readReceiptTooltip = `Read by ${peerUser?.displayName || 'recipient'} at ${readTime}`;
                          } else {
                            readReceiptTooltip = `Delivered to ${peerUser?.displayName || 'recipient'}`;
                          }
                        } else {
                          const otherReaderIds = Object.keys(msg.readBy || {}).filter((uid) => uid !== msg.senderId);
                          if (otherReaderIds.length > 0) {
                            isReadByOthers = true;
                            const names = otherReaderIds
                              .map((uid) => allUsers.find((u) => u.id === uid)?.displayName || 'Member')
                              .slice(0, 3)
                              .join(', ');
                            const extra = otherReaderIds.length > 3 ? ` +${otherReaderIds.length - 3} more` : '';
                            readReceiptTooltip = `Read by ${names}${extra}`;
                          } else {
                            readReceiptTooltip = 'Delivered to channel';
                          }
                        }
                      }

                      return (
                        <>
                          {!isSameSender && (
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-xs font-semibold text-neutral-200">
                                {author?.displayName || 'Unknown Member'}
                              </span>
                              {author?.isLeader && (
                                <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                                  LEADER
                                </span>
                              )}
                              <span className="text-[10px] text-neutral-500 font-mono inline-flex items-center gap-1">
                                {timeFormatted}
                                {isMe && (
                                  <span title={readReceiptTooltip} className="inline-flex items-center">
                                    {isReadByOthers ? (
                                      <CheckCheck className="w-3.5 h-3.5 text-sky-400" aria-label="Read" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5 text-neutral-500" aria-label="Delivered" />
                                    )}
                                  </span>
                                )}
                              </span>

                              {/* Pinned Badge */}
                              {msg.isPinned && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-mono text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded">
                                  <Pin className="w-2.5 h-2.5" /> PINNED
                                </span>
                              )}
                            </div>
                          )}

                          {/* Text body */}
                          {msg.text && (
                            <div className="text-xs text-neutral-200 leading-relaxed break-words whitespace-pre-wrap selection:bg-indigo-500/30">
                              {msg.text}
                              {isSameSender && isMe && (
                                <span
                                  title={readReceiptTooltip}
                                  className="inline-flex items-center text-neutral-500 hover:text-neutral-300 ml-1.5 align-middle select-none"
                                >
                                  {isReadByOthers ? (
                                    <CheckCheck className="w-3 h-3 text-sky-400 inline" aria-label="Read" />
                                  ) : (
                                    <Check className="w-3 h-3 text-neutral-500 inline" aria-label="Delivered" />
                                  )}
                                </span>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* Translation block */}
                    {translatedText && (
                      <div className="mt-2 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-2">
                        <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-indigo-400 font-mono uppercase font-semibold">
                            AI Translated Transmission:
                          </p>
                          <p className="mt-0.5 text-white">{translatedText}</p>
                        </div>
                      </div>
                    )}

                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-2 max-w-md">
                        {msg.attachments.map((att) => (
                          <div key={att.id} className="rounded-xl overflow-hidden border border-white/10 bg-white/5">
                            {att.type === 'image' && (
                              <button
                                type="button"
                                onClick={() => onPreviewAttachment(att)}
                                className="block w-full overflow-hidden hover:opacity-90 transition-opacity cursor-pointer"
                              >
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  className="max-h-72 w-full object-cover"
                                />
                              </button>
                            )}

                            {att.type === 'video' && (
                              <video
                                src={att.url}
                                controls
                                className="max-h-72 w-full object-cover"
                              />
                            )}

                            {att.type === 'audio' && (
                              <div className="p-1">
                                <VoiceMessagePlayer
                                  url={att.url}
                                  duration={att.duration}
                                  fileName={att.name}
                                  isMe={isMe}
                                />
                              </div>
                            )}

                            {att.type === 'file' && (
                              <div className="p-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 shrink-0">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-white truncate">
                                      {att.name}
                                    </p>
                                    {att.size && (
                                      <p className="text-[10px] text-neutral-400 font-mono">
                                        {(att.size / 1024).toFixed(1)} KB
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <a
                                  href={att.url}
                                  download={att.name}
                                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors shrink-0"
                                  title="Download attachment"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reaction Pills */}
                    {hasReactions && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {Object.entries(msg.reactions).map(([emoji, userIds]: [string, string[]]) => {
                          const hasReacted = userIds.includes(currentUser.id);
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => onReactMessage(msg.id, emoji)}
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${
                                hasReacted
                                  ? 'bg-indigo-600/25 border-indigo-500/40 text-indigo-300'
                                  : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                              }`}
                            >
                              <span>{emoji}</span>
                              <span className="text-[10px] font-mono">{userIds.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Thread Replies Button Bar */}
                    {Boolean(msg.replyCount && msg.replyCount > 0) && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveThreadMessageId(msg.id);
                          setShowPinnedDrawer(false);
                        }}
                        className="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 text-xs font-medium transition-all group"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                        <span>
                          {msg.replyCount} {msg.replyCount === 1 ? 'reply' : 'replies'}
                        </span>
                        {msg.lastReplyAt && (
                          <span className="text-[10px] text-neutral-400 font-mono">
                            Last reply{' '}
                            {new Date(msg.lastReplyAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                        <ChevronRight className="w-3 h-3 text-indigo-400 group-hover:translate-x-0.5 transition-transform ml-1" />
                      </button>
                    )}
                  </div>

                  {/* Floating Hover Actions */}
                  <div className="absolute right-3 -top-2.5 hidden group-hover:flex items-center gap-1 p-1 rounded-xl bg-[#1c1e29] border border-white/15 shadow-xl z-10">
                    {/* Reply in thread */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveThreadMessageId(msg.id);
                        setShowPinnedDrawer(false);
                      }}
                      className="p-1.5 text-neutral-400 hover:text-indigo-300 hover:bg-white/10 rounded-lg transition-colors"
                      title="Reply in nested thread"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>

                    {/* Pin / Unpin message */}
                    <button
                      type="button"
                      onClick={() => onPinMessage(msg.id, !msg.isPinned)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        msg.isPinned
                          ? 'text-amber-400 hover:bg-amber-500/10'
                          : 'text-neutral-400 hover:text-amber-400 hover:bg-white/10'
                      }`}
                      title={msg.isPinned ? 'Unpin transmission' : 'Pin transmission to channel banner'}
                    >
                      {msg.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                    </button>

                    {/* Quick Heart React */}
                    <button
                      type="button"
                      onClick={() => onReactMessage(msg.id, '❤️')}
                      className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-white/10 rounded-lg transition-colors"
                      title="React with ❤️"
                    >
                      <Heart className="w-3.5 h-3.5" />
                    </button>

                    {/* Emoji picker trigger */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveReactionPickerMsgId(
                            activeReactionPickerMsgId === msg.id ? null : msg.id
                          )
                        }
                        className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        title="Add reaction"
                      >
                        <Smile className="w-3.5 h-3.5" />
                      </button>

                      {activeReactionPickerMsgId === msg.id && (
                        <div className="absolute right-0 bottom-full mb-1 flex items-center gap-1 p-1.5 bg-[#1f222e] border border-white/15 rounded-2xl shadow-2xl z-30 animate-in fade-in">
                          {COMMON_REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                onReactMessage(msg.id, emoji);
                                setActiveReactionPickerMsgId(null);
                              }}
                              className="p-1.5 hover:bg-white/10 rounded-lg text-sm transition-transform hover:scale-125"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Translate */}
                    {msg.text && (
                      <button
                        type="button"
                        onClick={() => handleTranslate(msg)}
                        disabled={isTranslating}
                        className="p-1.5 text-neutral-400 hover:text-indigo-300 hover:bg-white/10 rounded-lg transition-colors"
                        title="Translate transmission"
                      >
                        <Globe className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Delete button (sender or admin) */}
                    {(isMe || currentUser.isAdmin || currentUser.isLeader) && (
                      <button
                        type="button"
                        onClick={() => onDeleteMessage(msg.id)}
                        className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-white/10 rounded-lg transition-colors"
                        title="Delete transmission"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Primary Composer Section */}
        <div className="p-3 md:p-4 bg-[#14161f] border-t border-white/10 shrink-0">
          {!canPost ? (
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-center text-xs text-neutral-400">
              🔒 Only Gatekeepers and Leaders are authorized to post dispatches in this announcement channel.
            </div>
          ) : (
            <div className="space-y-2">
              {/* Staged attachments preview tray */}
              {stagedAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
                  {stagedAttachments.map((att, idx) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-lg bg-[#1f222e] border border-white/10 text-xs text-neutral-200"
                    >
                      <span className="truncate max-w-[150px] font-medium">{att.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setStagedAttachments((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-0.5 text-neutral-400 hover:text-rose-400 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Recording Active Banner */}
              {isRecording ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3 bg-gradient-to-r from-rose-950/40 via-[#1a1622] to-rose-950/30 border border-rose-500/40 rounded-2xl shadow-lg gap-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-rose-300 tracking-wide uppercase font-mono text-[10px]">
                          Recording Voice Clip
                        </span>
                        <span className="text-xs font-mono font-bold text-white px-1.5 py-0.5 rounded bg-black/40 border border-white/10">
                          {Math.floor(recordingDuration / 60)}:
                          {String(recordingDuration % 60).padStart(2, '0')}
                        </span>
                      </div>
                    </div>

                    {/* Dynamic Voice Visualizer Bars */}
                    <div className="hidden sm:flex items-center gap-1 h-6 px-2.5 bg-black/40 rounded-lg border border-white/5">
                      {liveAudioLevels.map((lvl, idx) => (
                        <div
                          key={idx}
                          className="w-1 bg-gradient-to-t from-rose-500 via-amber-400 to-sky-400 rounded-full transition-all duration-75"
                          style={{ height: `${Math.max(16, lvl)}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="px-3 py-1.5 text-xs text-neutral-400 hover:text-rose-300 rounded-xl hover:bg-white/5 transition-colors flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => stopRecording(false)}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-neutral-200 font-medium text-xs rounded-xl transition-colors flex items-center gap-1.5"
                      title="Attach audio to composer for review"
                    >
                      <Square className="w-3 h-3 text-neutral-400" /> Review & Attach
                    </button>
                    <button
                      type="button"
                      onClick={() => stopRecording(true)}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-rose-600/30 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                      title="Stop and send voice transmission immediately"
                    >
                      <Send className="w-3.5 h-3.5" /> Send Voice Clip
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {/* Draft Preserved Banner */}
                  {inputText.trim().length > 0 && (
                    <div className="flex items-center justify-between px-2 text-[10px] font-mono text-neutral-400">
                      <span className="flex items-center gap-1 text-amber-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        {isDraftRestored ? 'Draft restored from local storage' : 'Draft preserved locally'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setInputText('');
                          inputTextRef.current = '';
                          setIsDraftRestored(false);
                          if (activeTarget) {
                            try {
                              localStorage.removeItem(`lvo_draft_${currentUser.id}_${activeTarget.type}_${activeTarget.id}`);
                            } catch (e) {}
                          }
                        }}
                        className="text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        Discard draft
                      </button>
                    </div>
                  )}

                  <div className="flex items-end gap-2 bg-[#1b1e28] border border-white/10 rounded-2xl p-2 focus-within:border-indigo-500/75 transition-colors">
                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      multiple
                      className="hidden"
                      accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx,.zip"
                    />

                    {/* Attachments & GIF & Mic buttons */}
                    <div className="flex items-center gap-0.5 pb-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                        title="Attach file or image"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={onOpenGifModal}
                        className="px-2 py-1 text-[11px] font-bold text-neutral-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors font-mono tracking-wider"
                        title="Send tactical GIF"
                      >
                        GIF
                      </button>

                      <button
                        type="button"
                        onClick={startRecording}
                        className="p-2 text-neutral-400 hover:text-rose-400 rounded-xl hover:bg-white/5 transition-colors"
                        title="Record voice note"
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Textarea */}
                    <textarea
                      value={inputText}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder={`Dispatch transmission to ${
                        activeTarget.type === 'channel' ? `#${activeTarget.name}` : activeTarget.name
                      }… (Enter to send)`}
                      rows={1}
                      className="flex-1 max-h-32 min-h-[40px] py-2 px-1 bg-transparent text-xs text-white placeholder:text-neutral-500 resize-none focus:outline-none leading-relaxed"
                    />

                    {/* Send Button */}
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!inputText.trim() && stagedAttachments.length === 0}
                      className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-40 disabled:hover:bg-indigo-600 shadow-md shadow-indigo-600/20 shrink-0 mb-0.5 cursor-pointer"
                      title="Send message"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* DEDICATED THREAD-REPLY SIDEBAR / DRAWER */}
      {activeThreadParent && (
        <aside className="w-80 md:w-96 border-l border-white/10 bg-[#12131b] flex flex-col h-full shrink-0 z-20 animate-in slide-in-from-right-4 duration-200">
          {/* Thread Header */}
          <div className="h-16 px-4 border-b border-white/10 bg-[#151722] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-semibold text-white truncate">Thread Discussion</h3>
                <p className="text-[10px] text-neutral-400 truncate">
                  Attached to {allUsers.find((u) => u.id === activeThreadParent.senderId)?.displayName || 'Member'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveThreadMessageId(null)}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Close thread"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Thread Content Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Root Parent Message Card */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-200">
                    {allUsers.find((u) => u.id === activeThreadParent.senderId)?.displayName || 'User'}
                  </span>
                  <span className="text-[9.5px] font-mono text-neutral-500">
                    {new Date(activeThreadParent.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {activeThreadParent.isPinned && (
                  <span className="text-[9px] font-mono text-amber-300 flex items-center gap-1">
                    <Pin className="w-2.5 h-2.5" /> Pinned
                  </span>
                )}
              </div>
              {activeThreadParent.text && (
                <p className="text-xs text-neutral-200 leading-relaxed break-words whitespace-pre-wrap">
                  {activeThreadParent.text}
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2">
              <div className="h-px bg-white/10 flex-1" />
              <span className="text-[10px] font-mono font-medium text-neutral-500 uppercase tracking-wider">
                {threadReplies.length} {threadReplies.length === 1 ? 'Reply' : 'Replies'}
              </span>
              <div className="h-px bg-white/10 flex-1" />
            </div>

            {/* Replies List */}
            {threadReplies.length === 0 ? (
              <div className="py-8 text-center text-neutral-500">
                <CornerDownRight className="w-5 h-5 mx-auto mb-2 text-neutral-600" />
                <p className="text-xs">No replies in this thread yet.</p>
                <p className="text-[10px] text-neutral-600 mt-0.5">Start the nested conversation below.</p>
              </div>
            ) : (
              threadReplies.map((reply) => {
                const author = allUsers.find((u) => u.id === reply.senderId);
                const isMe = reply.senderId === currentUser.id;

                return (
                  <div
                    key={reply.id}
                    className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-neutral-800 border border-white/10 flex items-center justify-center text-xs overflow-hidden shrink-0 mt-0.5">
                      {author?.avatar?.startsWith('data:') ? (
                        <img src={author.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        author?.avatar || '👤'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Thread reply header with read receipt */}
                      {(() => {
                        let isReplyRead = false;
                        let replyTooltip = 'Delivered';

                        if (isMe) {
                          if (activeTarget?.type === 'direct' || reply.recipientId) {
                            const peerId = reply.recipientId || (activeTarget?.type === 'direct' ? activeTarget.id : null);
                            const peerUser = allUsers.find((u) => u.id === peerId);
                            if (peerId && reply.readBy && reply.readBy[peerId]) {
                              isReplyRead = true;
                              const readTime = new Date(reply.readBy[peerId]).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              });
                              replyTooltip = `Read by ${peerUser?.displayName || 'recipient'} at ${readTime}`;
                            } else {
                              replyTooltip = `Delivered to ${peerUser?.displayName || 'recipient'}`;
                            }
                          } else {
                            const otherReaders = Object.keys(reply.readBy || {}).filter((uid) => uid !== reply.senderId);
                            if (otherReaders.length > 0) {
                              isReplyRead = true;
                              const names = otherReaders
                                .map((uid) => allUsers.find((u) => u.id === uid)?.displayName || 'Member')
                                .slice(0, 3)
                                .join(', ');
                              replyTooltip = `Read by ${names}`;
                            } else {
                              replyTooltip = 'Delivered to channel';
                            }
                          }
                        }

                        return (
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold text-neutral-300 truncate">
                              {author?.displayName || 'User'}
                            </span>
                            <span className="text-[9.5px] font-mono text-neutral-500 shrink-0 inline-flex items-center gap-1">
                              {new Date(reply.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {isMe && (
                                <span title={replyTooltip} className="inline-flex items-center">
                                  {isReplyRead ? (
                                    <CheckCheck className="w-3 h-3 text-sky-400" aria-label="Read" />
                                  ) : (
                                    <Check className="w-3 h-3 text-neutral-500" aria-label="Delivered" />
                                  )}
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })()}

                      {reply.text && (
                        <p className="text-xs text-neutral-200 mt-1 leading-relaxed break-words whitespace-pre-wrap">
                          {reply.text}
                        </p>
                      )}

                      {/* Attachments in thread */}
                      {reply.attachments && reply.attachments.length > 0 && (
                        <div className="mt-1.5 space-y-1.5">
                          {reply.attachments.map((att) => (
                            <div key={att.id} className="rounded-lg overflow-hidden border border-white/10">
                              {att.type === 'image' && (
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  className="max-h-48 w-full object-cover cursor-pointer"
                                  onClick={() => onPreviewAttachment(att)}
                                />
                              )}
                              {att.type === 'audio' && (
                                <div className="p-1">
                                  <VoiceMessagePlayer
                                    url={att.url}
                                    duration={att.duration}
                                    fileName={att.name}
                                    isMe={isMe}
                                  />
                                </div>
                              )}
                              {att.type === 'file' && (
                                <div className="p-2 bg-white/5 flex items-center justify-between text-xs">
                                  <span className="truncate">{att.name}</span>
                                  <a href={att.url} download={att.name} className="p-1 text-neutral-400 hover:text-white">
                                    <Download className="w-3 h-3" />
                                  </a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={threadEndRef} />
          </div>

          {/* Thread Composer */}
          <div className="p-3 bg-[#151722] border-t border-white/10 shrink-0">
            {threadAttachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {threadAttachments.map((att, idx) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/40 border border-white/10 text-[11px] text-neutral-300"
                  >
                    <span className="truncate max-w-[120px]">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => setThreadAttachments((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-neutral-500 hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2 bg-[#1c1e2a] border border-white/10 rounded-xl p-1.5 focus-within:border-indigo-500/75">
              <input
                type="file"
                ref={threadFileInputRef}
                onChange={handleThreadFileChange}
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx"
              />
              <button
                type="button"
                onClick={() => threadFileInputRef.current?.click()}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg"
                title="Attach file in thread"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>

              <textarea
                value={threadInputText}
                onChange={(e) => setThreadInputText(e.target.value)}
                onKeyDown={handleThreadKeyDown}
                placeholder="Reply in thread… (Enter)"
                rows={1}
                className="flex-1 max-h-28 py-1.5 px-1 bg-transparent text-xs text-white placeholder:text-neutral-500 resize-none focus:outline-none"
              />

              <button
                type="button"
                onClick={handleSendThread}
                disabled={!threadInputText.trim() && threadAttachments.length === 0}
                className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors"
                title="Send thread reply"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* DEDICATED PINNED MESSAGES SIDEBAR / DRAWER */}
      {showPinnedDrawer && (
        <aside className="w-80 md:w-96 border-l border-white/10 bg-[#12131b] flex flex-col h-full shrink-0 z-20 animate-in slide-in-from-right-4 duration-200">
          <div className="h-16 px-4 border-b border-white/10 bg-[#151722] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                <Pin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-semibold text-white truncate">Pinned Transmissions</h3>
                <p className="text-[10px] text-neutral-400 font-mono">
                  {pinnedMessages.length} pinned in this channel
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPinnedDrawer(false)}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Close pinned drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {pinnedMessages.length === 0 ? (
              <div className="py-12 text-center text-neutral-500">
                <Pin className="w-6 h-6 mx-auto mb-2 text-neutral-600" />
                <p className="text-xs font-medium text-neutral-400">No pinned transmissions</p>
                <p className="text-[10px] text-neutral-500 mt-1 max-w-xs mx-auto">
                  Hover over any important message and click the pin icon to keep critical information accessible.
                </p>
              </div>
            ) : (
              pinnedMessages.map((msg) => {
                const author = allUsers.find((u) => u.id === msg.senderId);
                const pinnedByUser = msg.pinnedBy ? allUsers.find((u) => u.id === msg.pinnedBy) : null;

                return (
                  <div
                    key={msg.id}
                    className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/40 transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-semibold text-neutral-200 truncate">
                          {author?.displayName || 'User'}
                        </span>
                        <span className="text-[9.5px] font-mono text-neutral-500">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onPinMessage(msg.id, false)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-rose-400 rounded transition-all"
                        title="Unpin message"
                      >
                        <PinOff className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {msg.text && (
                      <p className="text-xs text-neutral-200 leading-relaxed break-words line-clamp-4">
                        {msg.text}
                      </p>
                    )}

                    {msg.attachments && msg.attachments.length > 0 && (
                      <p className="text-[10px] font-mono text-indigo-300">
                        📎 {msg.attachments.length} attachment{msg.attachments.length === 1 ? '' : 's'}
                      </p>
                    )}

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                      <span className="text-neutral-500 font-mono">
                        Pinned by {pinnedByUser?.displayName || 'Member'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleJumpToMessage(msg.id)}
                        className="text-amber-400 hover:text-amber-300 font-mono font-medium flex items-center gap-1"
                      >
                        <span>Jump</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      )}
    </div>
  );
};
