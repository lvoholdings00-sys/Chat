import React, { useState } from 'react';
import { X, Trash2, Plus, Check } from 'lucide-react';
import type { Channel, User } from '../types';

interface ManageChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel;
  allUsers: User[];
  currentUserId: string;
  isLeaderOrAdmin: boolean;
  onUpdateChannel: (channelId: string, updates: Partial<Channel>) => Promise<void>;
  onDeleteChannel: (channelId: string) => Promise<void>;
}

export const ManageChannelModal: React.FC<ManageChannelModalProps> = ({
  isOpen,
  onClose,
  channel,
  allUsers,
  currentUserId,
  isLeaderOrAdmin,
  onUpdateChannel,
  onDeleteChannel,
}) => {
  const [icon, setIcon] = useState(channel.icon);
  const [name, setName] = useState(channel.name);
  const [selectedAddUserId, setSelectedAddUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const canManage = isLeaderOrAdmin || channel.createdBy === currentUserId;

  const handleSaveDetails = async () => {
    setSaving(true);
    setError('');
    try {
      await onUpdateChannel(channel.id, { icon, name });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (removeId: string) => {
    if (!canManage) return;
    try {
      const newMemberIds = channel.memberIds.filter((id) => id !== removeId);
      await onUpdateChannel(channel.id, { memberIds: newMemberIds });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove member.';
      setError(msg);
    }
  };

  const handleAddMember = async () => {
    if (!selectedAddUserId || channel.memberIds.includes(selectedAddUserId)) return;
    try {
      const newMemberIds = [...channel.memberIds, selectedAddUserId];
      await onUpdateChannel(channel.id, { memberIds: newMemberIds });
      setSelectedAddUserId('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add member.';
      setError(msg);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Permanently delete #${channel.name}?`)) return;
    setDeleting(true);
    try {
      await onDeleteChannel(channel.id);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete channel.';
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const unassignedUsers = allUsers.filter((u) => !channel.memberIds.includes(u.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#16181f] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div>
            <h2 className="font-['Fraunces'] text-xl font-semibold text-white tracking-wide">
              Manage #{channel.name}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {channel.type === 'announcement' ? 'Broadcast Frequency' : 'Standard Operations Group'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          {/* Symbol & Name */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={icon}
                maxLength={8}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="Symbol"
                disabled={!canManage}
                className="w-20 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white text-center font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Channel name"
                disabled={!canManage}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
              {canManage && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveDetails}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition-colors shrink-0"
                >
                  Save
                </button>
              )}
            </div>
          </div>

          {/* Members list */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Channel Roster ({channel.memberIds.length})
            </label>
            <div className="border border-white/10 rounded-xl bg-white/[0.02] max-h-44 overflow-y-auto divide-y divide-white/5 p-1">
              {channel.memberIds.map((mId) => {
                const member = allUsers.find((u) => u.id === mId);
                if (!member) return null;
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-xs shrink-0">
                        {member.avatar}
                      </span>
                      <span className="text-xs font-medium text-neutral-200 truncate">
                        {member.displayName}
                      </span>
                      {member.isLeader && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                          LEADER
                        </span>
                      )}
                    </div>
                    {canManage && channel.memberIds.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-neutral-500 hover:text-rose-400 p-1 rounded transition-colors text-xs"
                        title="Remove member"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add member select */}
          {canManage && unassignedUsers.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Add People
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedAddUserId}
                  onChange={(e) => setSelectedAddUserId(e.target.value)}
                  className="flex-1 px-3 py-2 bg-[#1b1e27] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select a member…</option>
                  {unassignedUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName} (@{u.username})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedAddUserId}
                  onClick={handleAddMember}
                  className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10 shrink-0">
          {canManage && channel.id !== 'chn_general' ? (
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleting ? 'Deleting…' : 'Delete Channel'}
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
