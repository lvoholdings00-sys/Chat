import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutCategory {
  title: string;
  items: {
    keys: string[];
    description: string;
  }[];
}

const SHORTCUTS: ShortcutCategory[] = [
  {
    title: 'Navigation & Palettes',
    items: [
      { keys: ['⌘', 'F'], description: 'Search across all messages & history' },
      { keys: ['⌘', 'K'], description: 'Open Quick Switcher / Command Palette' },
      { keys: ['⌘', '⇧', 'C'], description: 'Switch to Calendar view' },
      { keys: ['⌘', '⇧', 'N'], description: 'Switch to Executive News feed' },
      { keys: ['⌘', '⇧', 'M'], description: 'Switch to Chat Console' },
      { keys: ['⌘', '⇧', 'A'], description: 'Open Gatekeeper Admin Governance (if authorized)' },
      { keys: ['?'], description: 'Show this keyboard shortcuts guide' },
      { keys: ['ESC'], description: 'Close modals, thread panel, or command palette' },
    ],
  },
  {
    title: 'Messaging',
    items: [
      { keys: ['Enter'], description: 'Send message or thread reply' },
      { keys: ['⇧', 'Enter'], description: 'Insert new line in message composer' },
      { keys: ['Hover msg', '+ Reply'], description: 'Open dedicated nested thread conversation' },
      { keys: ['Hover msg', '+ Pin'], description: 'Pin critical message to channel banner' },
      { keys: ['Hover msg', '+ ❤️'], description: 'Quick react with heart telemetry' },
      { keys: ['Hover msg', '+ 🌐'], description: 'Translate message' },
    ],
  },
  {
    title: 'List & Channel Filtering',
    items: [
      { keys: ['↑', '↓'], description: 'Navigate items in Command Palette' },
      { keys: ['Enter'], description: 'Confirm selection and jump directly' },
      { keys: ['Search bar'], description: 'Filter channels and contacts instantly by name or status' },
    ],
  },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      id="keyboard-shortcuts-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="keyboard-shortcuts-modal"
        className="w-full max-w-lg bg-[#14161f] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#181a24]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Keyboard className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white">Keyboard Shortcuts</h3>
              <p className="text-[11px] text-neutral-400">
                Power-user hotkeys for getting around fast
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

        {/* Shortcuts Content */}
        <div className="p-4 overflow-y-auto space-y-5">
          {SHORTCUTS.map((cat) => (
            <div key={cat.title}>
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-indigo-300 font-semibold mb-2">
                {cat.title}
              </h4>
              <div className="space-y-1.5">
                {cat.items.map((item) => (
                  <div
                    key={item.description}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5"
                  >
                    <span className="text-xs text-neutral-300">{item.description}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, i) => (
                        <kbd
                          key={i}
                          className="px-2 py-0.5 text-[11px] font-mono font-medium text-white bg-white/10 border border-white/15 rounded shadow-sm"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 bg-[#151720] flex items-center justify-between text-xs text-neutral-400">
          <span className="font-mono text-[11px]">Note: On Windows / Linux, use Ctrl instead of ⌘</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
