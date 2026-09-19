import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Sparkles, ThumbsUp, CheckCircle, Flame } from 'lucide-react';

export interface ReactionOption {
  emoji: string;
  label: string;
  category: 'frequent' | 'feedback' | 'team' | 'status';
}

export const REACTION_PRESETS: ReactionOption[] = [
  // Frequently Used / Professional Feedback
  { emoji: '👍', label: 'Approve / Acknowledge', category: 'frequent' },
  { emoji: '✅', label: 'Completed / Verified', category: 'frequent' },
  { emoji: '👀', label: 'Reviewing / Looking', category: 'frequent' },
  { emoji: '🚀', label: 'Shipped / Deployed', category: 'frequent' },
  { emoji: '🎯', label: 'On Target / Bullseye', category: 'frequent' },
  { emoji: '💡', label: 'Great Idea / Insight', category: 'frequent' },
  { emoji: '⚡', label: 'Urgent / Priority', category: 'frequent' },
  { emoji: '🫡', label: 'Understood / On It', category: 'frequent' },

  // Team & Appreciation
  { emoji: '❤️', label: 'Love / Gratitude', category: 'team' },
  { emoji: '👏', label: 'Kudos / Well Done', category: 'team' },
  { emoji: '🙌', label: 'Celebration / High Five', category: 'team' },
  { emoji: '🤝', label: 'Agreed / In Sync', category: 'team' },
  { emoji: '💎', label: 'Exceptional Quality', category: 'team' },
  { emoji: '🏆', label: 'Win / Milestone', category: 'team' },

  // Status & Actions
  { emoji: '🔥', label: 'Critical / Trending', category: 'status' },
  { emoji: '💯', label: '100% / Perfect', category: 'status' },
  { emoji: '📌', label: 'Noted / Bookmarked', category: 'status' },
  { emoji: '⚠️', label: 'Attention / Caution', category: 'status' },
  { emoji: '💬', label: 'Needs Discussion', category: 'status' },
  { emoji: '☕', label: 'Take a Break', category: 'status' },
  { emoji: '🛠️', label: 'Fixing / Debugging', category: 'status' },
  { emoji: '🔒', label: 'Confidential / Secure', category: 'status' },
];

interface EmojiPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right';
}

export const EmojiPopover: React.FC<EmojiPopoverProps> = ({
  isOpen,
  onClose,
  onSelectEmoji,
  position = 'top-right',
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'frequent' | 'team' | 'status'>('all');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredReactions = REACTION_PRESETS.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      !search.trim() ||
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.emoji.includes(search.trim());
    return matchesCategory && matchesSearch;
  });

  const positionClasses = {
    'top-right': 'bottom-full right-0 mb-2',
    'top-left': 'bottom-full left-0 mb-2',
    'bottom-right': 'top-full right-0 mt-2',
  }[position];

  return (
    <div
      ref={popoverRef}
      className={`absolute ${positionClasses} z-50 w-72 bg-[#181a24] border border-white/15 rounded-2xl shadow-2xl p-3 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 select-none`}
    >
      {/* Popover Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[11px] font-semibold tracking-wide text-white uppercase font-mono">
            Quick Feedback
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-neutral-400 hover:text-white p-0.5 rounded-md hover:bg-white/10 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 mb-2.5 p-1 bg-white/5 rounded-xl text-[10.5px]">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`flex-1 py-1 rounded-lg text-center font-medium transition-all ${
            selectedCategory === 'all'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory('frequent')}
          className={`flex-1 py-1 rounded-lg text-center font-medium transition-all ${
            selectedCategory === 'frequent'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Work
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory('team')}
          className={`flex-1 py-1 rounded-lg text-center font-medium transition-all ${
            selectedCategory === 'team'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Kudos
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory('status')}
          className={`flex-1 py-1 rounded-lg text-center font-medium transition-all ${
            selectedCategory === 'status'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Status
        </button>
      </div>

      {/* Emoji Grid */}
      <div className="grid grid-cols-4 gap-1.5 max-h-44 overflow-y-auto pr-0.5 custom-scrollbar">
        {filteredReactions.map((item) => (
          <button
            key={item.emoji}
            type="button"
            onClick={() => {
              onSelectEmoji(item.emoji);
              onClose();
            }}
            title={item.label}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/[0.03] hover:bg-indigo-500/20 hover:border-indigo-500/40 border border-transparent transition-all group cursor-pointer"
          >
            <span className="text-xl group-hover:scale-125 transition-transform duration-150">
              {item.emoji}
            </span>
            <span className="text-[9px] text-neutral-400 group-hover:text-indigo-200 truncate w-full text-center mt-0.5 font-medium">
              {item.label.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>

      {/* Footer hint */}
      <div className="mt-2 pt-2 border-t border-white/5 text-[10px] text-neutral-400 text-center font-mono">
        Click reaction to send instant dispatch feedback
      </div>
    </div>
  );
};
