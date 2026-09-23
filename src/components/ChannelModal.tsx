import React, { useState } from 'react';
import { X, Hash, Volume2, Users, Check } from 'lucide-react';
import type { User } from '../types';

interface ChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUserId: string;
  onCreateChannel: (data: {
    name: string;
    icon: string;
    type: 'group' | 'announcement';
    memberIds: string[];
    description: string;
  }) => Promise<void>;
}

export const ChannelModal: React.FC<ChannelModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUserId,
  onCreateChannel,
}) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('💬');
  const [type, setType] = useState<'group' | 'announcement'>('group');
  const [description, setDescription] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([currentUserId]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleMember = (id: string) => {
    if (id === currentUserId) return; // Keep self
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Channel name is required.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onCreateChannel({
        name: name.trim(),
        icon: icon.trim() || (type === 'announcement' ? '📢' : '💬'),
        type,
        memberIds: selectedMemberIds,
        description: description.trim(),
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create channel.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#16181f] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div>
            <h2 className="font-['Fraunces'] text-xl font-semibold text-white tracking-wide">
              New Channel
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Establish a secure communications frequency.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">
              Channel Name
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-neutral-500 text-sm">#</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="vindex-ops"
                className="w-full pl-7 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">
                Symbol / Icon
              </label>
              <input
                type="text"
                value={icon}
                maxLength={8}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="🛠️ or VX"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white text-center placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">
                Type
              </label>
              <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setType('group')}
                  className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${
                    type === 'group'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3 h-3" /> Group
                </button>
                <button
                  type="button"
                  onClick={() => setType('announcement')}
                  className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${
                    type === 'announcement'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Volume2 className="w-3 h-3" /> Broadcast
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">
              Directive / Topic
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                Authorized Members ({selectedMemberIds.length})
              </label>
              <button
                type="button"
                onClick={() => setSelectedMemberIds(users.map((u) => u.id))}
                className="text-[11px] text-indigo-400 hover:text-indigo-300"
              >
                Add All
              </button>
            </div>
            <div className="border border-white/10 rounded-xl bg-white/[0.02] max-h-36 overflow-y-auto divide-y divide-white/5 p-1">
              {users.map((u) => {
                const isSelected = selectedMemberIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleMember(u.id)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-xs shrink-0">
                        {u.avatar}
                      </span>
                      <span className="text-xs font-medium text-neutral-200 truncate">
                        {u.displayName}
                      </span>
                      {u.isLeader && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                          LEADER
                        </span>
                      )}
                    </div>
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'border-white/20'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
