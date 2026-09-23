import React, { useState } from 'react';
import { Clock, Calendar, X, AlertCircle } from 'lucide-react';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduleMessage: (scheduledIsoString: string) => void;
  messageTextPreview: string;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  onScheduleMessage,
  messageTextPreview,
}) => {
  // Default to 1 hour from now formatted for input
  const getInitialDateTime = () => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    // Format YYYY-MM-DDTHH:mm for local datetime input
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [dateTime, setDateTime] = useState(getInitialDateTime);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleQuickSelect = (minutesFromNow: number) => {
    const d = new Date(Date.now() + minutesFromNow * 60 * 1000);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    setDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedDate = new Date(dateTime);
    if (isNaN(selectedDate.getTime())) {
      setError('Please choose a valid date and time.');
      return;
    }

    if (selectedDate.getTime() <= Date.now() + 10 * 1000) {
      setError('Please schedule the delivery at least 1 minute in the future.');
      return;
    }

    onScheduleMessage(selectedDate.toISOString());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-2xl p-6 shadow-2xl text-neutral-100">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Schedule Message</h3>
              <p className="text-[11px] text-neutral-400">Deliver message at a future time</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message preview snippet */}
        {messageTextPreview && (
          <div className="mb-4 p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60 text-xs text-neutral-300">
            <span className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">
              Message to schedule:
            </span>
            <p className="line-clamp-2 italic">"{messageTextPreview}"</p>
          </div>
        )}

        {/* Quick select presets */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-neutral-300 mb-2">
            Quick delivery presets
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickSelect(30)}
              className="px-2.5 py-1.5 rounded-xl text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-center transition-colors"
            >
              In 30 min
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect(60)}
              className="px-2.5 py-1.5 rounded-xl text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-center transition-colors"
            >
              In 1 hour
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect(1440)}
              className="px-2.5 py-1.5 rounded-xl text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-center transition-colors"
            >
              Tomorrow
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Custom Date & Time
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => {
                  setDateTime(e.target.value);
                  if (error) setError('');
                }}
                className="w-full px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-white text-xs focus:outline-none focus:border-neutral-400 transition-colors cursor-pointer"
              />
            </div>
            {error && (
              <p className="text-[11px] text-rose-400 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-neutral-200 text-black shadow-md transition-colors"
            >
              Schedule Delivery
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
