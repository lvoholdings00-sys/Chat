import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, Trash2, X } from 'lucide-react';
import type { CalendarEvent, User } from '../types';

interface CalendarViewProps {
  events: CalendarEvent[];
  currentUser: User;
  onAddEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onBackMobile?: () => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  currentUser,
  onAddEvent,
  onDeleteEvent,
  onBackMobile,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New event form state
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(selectedDate);
  const [newTime, setNewTime] = useState('12:00');
  const [newDesc, setNewDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Compute month grid
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) {
      setError('Title and Date are required.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onAddEvent({
        title: newTitle.trim(),
        date: newDate,
        time: newTime,
        description: newDesc.trim(),
        createdBy: currentUser.id,
      });
      setIsModalOpen(false);
      setNewTitle('');
      setNewDesc('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save event.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDayEvents = events.filter((e) => e.date === selectedDate);

  // Build grid calendar days
  const calendarCells = [];

  // Trailing days from previous month
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevMonthDate = new Date(year, month - 1, dayNum);
    const dateStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    calendarCells.push({ dayNum, dateStr, isCurrentMonth: false });
  }

  // Days in current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({ dayNum: d, dateStr, isCurrentMonth: true });
  }

  // Next month leading days to complete grid to multiple of 7
  const remainingCells = 42 - calendarCells.length;
  for (let d = 1; d <= remainingCells; d++) {
    const nextMonthDate = new Date(year, month + 1, d);
    const dateStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({ dayNum: d, dateStr, isCurrentMonth: false });
  }

  const todayStr = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  })();

  return (
    <div className="flex-1 flex flex-col bg-[#0f1016] h-full overflow-y-auto p-4 md:p-6 select-none">
      {/* View Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {onBackMobile && (
            <button
              onClick={onBackMobile}
              className="md:hidden p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10"
              title="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="font-['Fraunces'] text-2xl font-bold text-white tracking-wide">
              Operations Calendar
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Team events, meetings, and schedules.
            </p>
          </div>
        </div>

        {/* Nav & New Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-xs text-white min-w-[140px] text-center">
              {monthName}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setNewDate(selectedDate);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Event</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="border border-white/10 rounded-2xl bg-[#14161f] overflow-hidden p-4 shadow-xl">
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {DAYS_OF_WEEK.map((dow) => (
            <div
              key={dow}
              className="text-center text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 py-1"
            >
              {dow}
            </div>
          ))}
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarCells.map((cell) => {
            const isToday = cell.dateStr === todayStr;
            const isSelected = cell.dateStr === selectedDate;
            const dayEvents = events.filter((e) => e.date === cell.dateStr);

            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => setSelectedDate(cell.dateStr)}
                className={`min-h-[76px] p-2 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  !cell.isCurrentMonth
                    ? 'border-transparent text-neutral-600 bg-white/[0.01]'
                    : isSelected
                    ? 'border-indigo-500 bg-indigo-500/15 shadow-md shadow-indigo-500/10'
                    : isToday
                    ? 'border-indigo-400/50 bg-white/5 text-white'
                    : 'border-white/5 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06] text-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-mono font-semibold ${
                      isToday ? 'text-indigo-400 font-bold' : ''
                    }`}
                  >
                    {cell.dayNum}
                  </span>
                  {isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                  )}
                </div>

                {/* Event dots */}
                <div className="space-y-1 mt-1">
                  {dayEvents.slice(0, 2).map((ev) => (
                    <div
                      key={ev.id}
                      className="text-[9.5px] truncate px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium"
                    >
                      {ev.time ? `${ev.time} ` : ''}
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[9px] text-neutral-400 font-mono pl-1">
                      +{dayEvents.length - 2} more
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Events Schedule Panel */}
      <div className="mt-6 border border-white/10 rounded-2xl bg-[#14161f] p-5">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
              Schedule for {selectedDate} ({selectedDayEvents.length} Events)
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setNewDate(selectedDate);
              setIsModalOpen(true);
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add to this date
          </button>
        </div>

        {selectedDayEvents.length === 0 ? (
          <p className="text-xs text-neutral-500 py-4 text-center">
            No events scheduled for this date.
          </p>
        ) : (
          <div className="space-y-2">
            {selectedDayEvents.map((evt) => (
              <div
                key={evt.id}
                className="flex items-start justify-between gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex items-center gap-1 text-indigo-300 font-mono text-xs font-semibold bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 shrink-0">
                    <Clock className="w-3 h-3" />
                    <span>{evt.time || 'All Day'}</span>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-white">{evt.title}</h3>
                    {evt.description && (
                      <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                        {evt.description}
                      </p>
                    )}
                  </div>
                </div>

                {(currentUser.isAdmin || currentUser.isLeader || evt.createdBy === currentUser.id) && (
                  <button
                    type="button"
                    onClick={() => onDeleteEvent(evt.id)}
                    className="p-1.5 text-neutral-500 hover:text-rose-400 rounded-lg hover:bg-white/5 transition-colors shrink-0"
                    title="Delete event"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#16181f] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h2 className="font-['Fraunces'] text-xl font-semibold text-white tracking-wide">
                  Schedule Event
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Visible to all members across the LVO command.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4 my-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">
                  Event Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Team Sync"
                  required
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">
                    Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">
                  Description / Details
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Brief details or objectives for this event…"
                  rows={3}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {error && <p className="text-xs text-rose-400">{error}</p>}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Scheduling…' : 'Confirm Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
