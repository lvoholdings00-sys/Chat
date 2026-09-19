export interface CustomStatus {
  emoji?: string;
  text: string;
  updatedAt?: string;
}

export type AppTheme = 'midnight' | 'slate' | 'emerald' | 'amber' | 'light' | 'dark';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  isLeader: boolean;
  isAdmin: boolean;
  needsPasswordChange?: boolean;
  status?: 'online' | 'idle' | 'offline';
  customStatus?: CustomStatus;
  theme?: AppTheme;
  lastSeen?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  size?: number;
  duration?: number;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // userIds who voted
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  isMultipleChoice?: boolean;
  isClosed?: boolean;
  createdBy: string;
  createdAt: string;
}

export interface ScheduledMessage {
  id: string;
  channelId?: string;
  recipientId?: string;
  senderId: string;
  text: string;
  scheduledFor: string; // ISO 8601 timestamp
  attachments?: Attachment[];
  parentMessageId?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  channelId?: string;
  recipientId?: string; // If set, this is a Direct Message
  senderId: string;
  text: string;
  timestamp: string;
  attachments?: Attachment[];
  reactions: Record<string, string[]>; // emoji/type -> userIds
  translatedText?: string;
  translatedLang?: string;
  // Thread support
  parentMessageId?: string;
  replyCount?: number;
  lastReplyAt?: string;
  // Pinning support
  isPinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: string;
  // Read receipts support
  readBy?: Record<string, string>; // userId -> timestamp ISO string
  // Interactive poll support
  poll?: Poll;
  // Scheduled metadata indicator if it originated as scheduled
  scheduledFor?: string;
}

export interface Channel {
  id: string;
  name: string;
  icon: string;
  type: 'group' | 'announcement';
  memberIds: string[];
  createdBy: string;
  createdAt: string;
  description?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  description?: string;
  createdBy: string;
  createdAt: string;
}

export interface NewsPost {
  id: string;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  isPinned: boolean;
  createdAt: string;
}

export type ActiveTab = 'chat' | 'calendar' | 'news';

export interface ChatTarget {
  type: 'channel' | 'direct';
  id: string; // channelId or peerUserId
  name: string;
  avatar?: string;
  icon?: string;
  channelType?: 'group' | 'announcement';
  status?: 'online' | 'idle' | 'offline';
  customStatus?: CustomStatus;
  isLeader?: boolean;
}
