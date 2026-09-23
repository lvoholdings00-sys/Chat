import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  UserPlus,
  Users,
  Hash,
  MessageSquare,
  Trash2,
  KeyRound,
  Shield,
  ShieldAlert,
  X,
  Plus,
} from 'lucide-react';
import type { User, Channel, Message } from '../types';
import { AdminTelemetryDashboard } from './AdminTelemetryDashboard';

interface DmThreadSummary {
  id: string;
  userA: { id: string; displayName: string; avatar: string };
  userB: { id: string; displayName: string; avatar: string };
  messageCount: number;
  lastTimestamp: string;
  lastText: string;
}

interface AdminPanelProps {
  currentUser: User;
  users: User[];
  channels: Channel[];
  onClose: () => void;
  onOpenCreateChannelModal: () => void;
  onDeleteChannel: (channelId: string) => Promise<void>;
  onRefreshUsers: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  users,
  channels,
  onClose,
  onOpenCreateChannelModal,
  onDeleteChannel,
  onRefreshUsers,
}) => {
  // Add Member State
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('Password123!');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [adding, setAdding] = useState(false);

  // DM Audit State
  const [threads, setThreads] = useState<DmThreadSummary[]>([]);
  const [activeAuditThread, setActiveAuditThread] = useState<{
    userA: string;
    userB: string;
    title: string;
  } | null>(null);
  const [auditMessages, setAuditMessages] = useState<Message[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Fetch DM threads for admin audit
  const fetchDmThreads = async () => {
    try {
      const res = await fetch('/api/admin/dm-threads');
      const data = await res.json();
      if (data.threads) {
        setThreads(data.threads);
      }
    } catch (err) {
      console.warn('Failed to load DM audit threads:', err);
    }
  };

  useEffect(() => {
    fetchDmThreads();
  }, []);

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) {
      setAddError('Username is required.');
      return;
    }
    setAddError('');
    setAddSuccess('');
    setAdding(true);

    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          displayName: newDisplayName.trim(),
          temporaryPassword: newPassword.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create member');

      setAddSuccess(`Member @${data.user.username} successfully registered!`);
      setNewUsername('');
      setNewDisplayName('');
      onRefreshUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Creation failed';
      setAddError(msg);
    } finally {
      setAdding(false);
    }
  };

  const handleToggleLeader = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/toggle-leader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) onRefreshUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetPassword = async (userId: string) => {
    const temp = prompt('Enter new temporary password for member:', 'Password123!');
    if (!temp) return;
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPassword: temp }),
      });
      if (res.ok) {
        alert('Passkey reset. Member will be prompted to change it on next login.');
        onRefreshUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to permanently revoke this member access?')) return;
    try {
      const res = await fetch(`/api/admin/user/${userId}`, { method: 'DELETE' });
      if (res.ok) onRefreshUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const openAuditThread = async (userAId: string, userBId: string, title: string) => {
    setActiveAuditThread({ userA: userAId, userB: userBId, title });
    setLoadingAudit(true);
    try {
      const res = await fetch(`/api/admin/dm-thread/${userAId}/${userBId}`);
      const data = await res.json();
      setAuditMessages(data.messages || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAudit(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0f1016] h-full overflow-y-auto p-4 md:p-8 select-none">
      {/* Top Bar */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 mb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-['Fraunces'] text-2xl font-bold text-white tracking-wider">
              𝐋𝐕𝐎 — GATEKEEPER ADMIN
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
              ROOT AUTHORIZATION
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Manage member access, channels, and view activity logs.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 hover:text-white rounded-xl text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Live Comms
        </button>
      </div>

      <div className="max-w-4xl w-full mx-auto space-y-8">
        {/* RECHARTS DASHBOARD: 30-DAY MESSAGE VOLUME & ACTIVE USER TRENDS */}
        <AdminTelemetryDashboard />

        {/* CARD: ADD A MEMBER */}
        <div className="bg-[#14161f] border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
              Authorize New Member
            </h2>
          </div>

          <form onSubmit={handleCreateMember} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. vance"
                  className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  Display Name (Optional)
                </label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="e.g. Marcus Vance"
                  className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  Temporary Passkey (8+ chars)
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Password123!"
                  className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white font-mono placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={adding}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {adding ? 'Authorizing…' : 'Add Member'}
              </button>
            </div>

            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Give them the username and temporary password directly — they will be required to set their own permanent password on their first login.
            </p>

            {addError && <p className="text-xs text-rose-400">{addError}</p>}
            {addSuccess && <p className="text-xs text-emerald-400">{addSuccess}</p>}
          </form>
        </div>

        {/* CARD: MEMBERS ROSTER */}
        <div className="bg-[#14161f] border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                Members ({users.length})
              </h2>
            </div>
          </div>

          <div className="divide-y divide-white/5 border border-white/10 rounded-xl overflow-hidden bg-white/[0.01]">
            {users.map((u) => (
              <div
                key={u.id}
                className="p-3.5 flex items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-8 h-8 rounded-xl bg-neutral-800 border border-white/10 flex items-center justify-center text-sm shrink-0">
                    {u.avatar}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-white truncate">{u.displayName}</p>
                      {u.isLeader && (
                        <span className="text-[8.5px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25 font-bold">
                          LEADER
                        </span>
                      )}
                      {u.isAdmin && (
                        <span className="text-[8.5px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 font-bold">
                          GATEKEEPER
                        </span>
                      )}
                      {u.needsPasswordChange && (
                        <span className="text-[8.5px] font-mono px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-300 border border-rose-500/25 font-bold">
                          TEMP PASSKEY
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400 font-mono">@{u.username}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleLeader(u.id)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
                  >
                    {u.isLeader ? 'Revoke Leader' : 'Promote Leader'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleResetPassword(u.id)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-400 hover:bg-white/5 transition-colors"
                    title="Reset password"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>

                  {u.id !== 'usr_admin' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
                      title="Revoke access"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CARD: CHANNELS MANAGEMENT */}
        <div className="bg-[#14161f] border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-indigo-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                Communication Frequencies ({channels.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={onOpenCreateChannelModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> New Channel
            </button>
          </div>

          <div className="divide-y divide-white/5 border border-white/10 rounded-xl overflow-hidden bg-white/[0.01]">
            {channels.map((c) => (
              <div
                key={c.id}
                className="p-3.5 flex items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg">{c.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white">#{c.name}</p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {c.description || `${c.memberIds.length} members`} •{' '}
                      <span className="capitalize">{c.type}</span>
                    </p>
                  </div>
                </div>

                {c.id !== 'chn_general' && (
                  <button
                    type="button"
                    onClick={() => onDeleteChannel(c.id)}
                    className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-colors"
                    title="Delete channel"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CARD: DIRECT MESSAGES AUDIT (Original requirement) */}
        <div className="bg-[#14161f] border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
              Direct Message Surveillance & Audit Log
            </h2>
          </div>
          <p className="text-[11px] text-neutral-400 mb-4">
            Direct messages are visible to Gatekeepers for moderation purposes. Click any thread to review its full history.
          </p>

          {threads.length === 0 ? (
            <p className="text-xs text-neutral-500 py-4 text-center">
              No direct messages between these two people yet.
            </p>
          ) : (
            <div className="divide-y divide-white/5 border border-white/10 rounded-xl overflow-hidden bg-white/[0.01]">
              {threads.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    openAuditThread(
                      t.userA.id,
                      t.userB.id,
                      `${t.userA.displayName} ↔ ${t.userB.displayName}`
                    )
                  }
                  className="w-full p-3.5 flex items-center justify-between gap-4 text-left hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex -space-x-2 shrink-0">
                      <span className="w-7 h-7 rounded-lg bg-neutral-800 border border-white/10 flex items-center justify-center text-xs">
                        {t.userA.avatar}
                      </span>
                      <span className="w-7 h-7 rounded-lg bg-neutral-700 border border-white/10 flex items-center justify-center text-xs">
                        {t.userB.avatar}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {t.userA.displayName} and {t.userB.displayName}
                      </p>
                      <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                        {t.lastText || 'Attachment'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-neutral-300">
                      {t.messageCount} msgs
                    </span>
                    <p className="text-[9.5px] text-neutral-500 font-mono mt-1">
                      {new Date(t.lastTimestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Read-Only Admin DM Viewer Modal */}
      {activeAuditThread && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#16181f] border border-white/10 rounded-2xl w-full max-w-xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
              <div>
                <h2 className="font-['Fraunces'] text-lg font-semibold text-white tracking-wide">
                  Audit: {activeAuditThread.title}
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Read-only surveillance view. Dispatches cannot be altered.
                </p>
              </div>
              <button
                onClick={() => setActiveAuditThread(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3 min-h-[250px]">
              {loadingAudit ? (
                <p className="text-xs text-neutral-500 text-center py-10">
                  Retrieving encrypted message store…
                </p>
              ) : auditMessages.length === 0 ? (
                <p className="text-xs text-neutral-500 text-center py-10">No messages found.</p>
              ) : (
                auditMessages.map((msg) => {
                  const sender = users.find((u) => u.id === msg.senderId);
                  return (
                    <div key={msg.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-indigo-300">
                          {sender?.displayName || msg.senderId}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {new Date(msg.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-200 whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setActiveAuditThread(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-white/5 rounded-xl hover:bg-white/10"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
