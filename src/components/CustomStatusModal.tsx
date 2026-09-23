import React, { useState } from 'react';
import { Smile, X, Check, Clock, Trash2 } from 'lucide-react';
import type { CustomStatus } from '../types';

interface CustomStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus?: CustomStatus;
  onSaveStatus: (status?: CustomStatus) => void;
}

const PRESET_STATUSES: { emoji: string; text: string }[] = [
  { emoji: '💬', text: 'Available' },
  { emoji: '🗓️', text: 'In a meeting' },
  { emoji: '⏳', text: 'Away' },
  { emoji: '⚡', text: 'In deep focus' },
  { emoji: '🛡️', text: 'Perimeter patrol' },
  { emoji: '🛰️', text: 'Field operations' },
  { emoji: '👑', text: 'In a meeting' },
  { emoji: '✈️', text: 'Traveling' },
];

const COMMON_EMOJIS = ['💬', '🗓️', '⚡', '⏳', '🎯', '🛡️', '🛰️', '👑', '🔥', '💎', '🫡', '☕', '🧠', '🎧'];

export const CustomStatusModal: React.FC<CustomStatusModalProps> = ({
  isOpen,
  onClose,
  currentStatus,
  onSaveStatus,
}) => {
  const [selectedEmoji, setSelectedEmoji] = useState(currentStatus?.emoji || '💬');
  const [statusText, setStatusText] = useState(currentStatus?.text || '');

  if (!isOpen) return null;

  const handleSelectPreset = (preset: { emoji: string; text: string }) => {
    setSelectedEmoji(preset.emoji);
    setStatusText(preset.text);
  };

  const handleSave = () => {
    if (!statusText.trim()) {
      onSaveStatus(undefined);
    } else {
      onSaveStatus({
        emoji: selectedEmoji,
        text: statusText.trim(),
        updatedAt: new Date().toISOString(),
      });
    }
    onClose();
  };

  const handleClear = () => {
    onSaveStatus(undefined);
    onClose();
  };

  return (
    <div
      id="custom-status-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="custom-status-modal"
        className="w-full max-w-md bg-[#14161f] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#181a24]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Smile className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white">Set Custom Status</h3>
              <p className="text-[11px] text-neutral-400">
                Broadcast your current activity alongside your presence dot
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Active Status Preview & Input */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
              Status Message
            </label>
            <div className="flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded-xl focus-within:border-indigo-500 transition-colors">
              {/* Emoji selector dropdown / quick selector */}
              <div className="relative group shrink-0">
                <button
                  type="button"
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg transition-transform active:scale-95"
                  title="Change emoji"
                >
                  {selectedEmoji}
                </button>
                <div className="hidden group-hover:flex absolute left-0 top-full mt-1 p-2 bg-[#1f222e] border border-white/15 rounded-xl shadow-xl z-20 flex-wrap gap-1 w-48">
                  {COMMON_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setSelectedEmoji(em)}
                      className="p-1 hover:bg-white/10 rounded text-base hover:scale-110 transition-transform"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="text"
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                placeholder="What's your status? (e.g. In a meeting)"
                maxLength={60}
                className="flex-1 bg-transparent text-xs text-white placeholder:text-neutral-500 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                  }
                }}
              />
              {statusText && (
                <button
                  type="button"
                  onClick={() => setStatusText('')}
                  className="text-neutral-400 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-neutral-500 mt-1 font-mono text-right">
              {statusText.length}/60 characters
            </p>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-2">
              Quick Presets
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESET_STATUSES.map((preset) => {
                const isActive = selectedEmoji === preset.emoji && statusText === preset.text;
                return (
                  <button
                    key={preset.text}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-left text-xs transition-all border ${
                      isActive
                        ? 'bg-indigo-600/30 border-indigo-500/50 text-white font-medium'
                        : 'bg-white/[0.03] border-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="text-base shrink-0">{preset.emoji}</span>
                    <span className="truncate">{preset.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-3 border-t border-white/10 bg-[#151720] flex items-center justify-between">
          {currentStatus?.text ? (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Status</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/25 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Status</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
