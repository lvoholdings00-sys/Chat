import React, { useState, useEffect } from 'react';
import { Clock, Trash2, X, Send, Calendar, AlertCircle } from 'lucide-react';
import type { ScheduledMessage } from '../types';

interface ScheduledDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  targetId?: string;
  onCancelScheduled: (id: string) => Promise<void>;
  onSendNowScheduled: (id: string) => Promise<void>;
}

export const ScheduledDrawer: React.FC<ScheduledDrawerProps> = ({
  isOpen,
  onClose,
  targetId,
  onCancelScheduled,
  onSendNowScheduled,
}) => {
  const [scheduledList, setScheduledList] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchScheduled = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/scheduled-messages');
      if (res.ok) {
        const data = await res.json();
        setScheduledList(data.scheduled || []);
      }
    } catch (err) {
      console.error('Failed to fetch scheduled messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchScheduled();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter for current channel/recipient if targetId provided, or show all user's scheduled
  const relevantList = targetId
    ? scheduledList.filter((s) => s.channelId === targetId || s.recipientId === targetId)
    : scheduledList;

  const handleCancel = async (id: string) => {
    setActionLoadingId(id);
    try {
      await onCancelScheduled(id);
      setScheduledList((prev) => prev.filter((item) => item.id !== id));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSendNow = async (id: string) => {
    setActionLoadingId(id);
    try {
      await onSendNowScheduled(id);
      setScheduledList((prev) => prev.filter((item) => item.id !== id));
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <aside className="w-80 md:w-96 border-l border-neutral-800 bg-neutral-900 flex flex-col h-full shrink-0 z-20 animate-in slide-in-from-right-4 duration-200 text-neutral-100">
      {/* Header */}
      <div className="h-16 px-4 border-b border-neutral-800 bg-neutral-900/90 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-200">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-white truncate">Scheduled Messages</h3>
            <p className="text-[10px] text-neutral-400 font-mono">
              {relevantList.length} queued for delivery
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          title="Close scheduled drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="py-12 text-center text-xs text-neutral-500">Loading queued messages…</div>
        ) : relevantList.length === 0 ? (
          <div className="py-12 text-center text-neutral-500">
            <Clock className="w-6 h-6 mx-auto mb-2 text-neutral-600" />
            <p className="text-xs font-medium text-neutral-400">No scheduled messages</p>
            <p className="text-[10px] text-neutral-500 mt-1 max-w-xs mx-auto">
              Use the clock icon next to the message field to queue messages for automatic delivery at a specific time.
            </p>
          </div>
        ) : (
          relevantList.map((item) => {
            const scheduledDate = new Date(item.scheduledFor);
            const isPast = scheduledDate.getTime() <= Date.now();

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-neutral-800/60 border border-neutral-700/70 hover:border-neutral-500 transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="flex items-center gap-1.5 text-white font-medium">
                    <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                    {scheduledDate.toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    at{' '}
                    {scheduledDate.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {isPast && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono">
                      Sending soon
                    </span>
                  )}
                </div>

                {item.text && (
                  <p className="text-xs text-neutral-200 leading-relaxed break-words line-clamp-3">
                    {item.text}
                  </p>
                )}

                {item.attachments && item.attachments.length > 0 && (
                  <p className="text-[10px] font-mono text-neutral-400">
                    📎 {item.attachments.length} attachment{item.attachments.length === 1 ? '' : 's'}
                  </p>
                )}

                <div className="pt-2 border-t border-neutral-700/50 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    disabled={actionLoadingId === item.id}
                    onClick={() => handleSendNow(item.id)}
                    className="text-[11px] font-medium text-neutral-300 hover:text-white flex items-center gap-1 hover:underline underline-offset-2"
                  >
                    <Send className="w-3 h-3" />
                    <span>Send now</span>
                  </button>

                  <button
                    type="button"
                    disabled={actionLoadingId === item.id}
                    onClick={() => handleCancel(item.id)}
                    className="text-[11px] text-neutral-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
