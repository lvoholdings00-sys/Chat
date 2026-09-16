import React, { useState } from 'react';
import { BarChart2, Check, CheckSquare, Square, X, Lock, Users } from 'lucide-react';
import type { Poll, User } from '../types';

interface PollCardProps {
  poll: Poll;
  messageId: string;
  currentUser: User;
  allUsers: User[];
  onVote: (messageId: string, optionId: string) => void;
  onClosePoll?: (messageId: string) => void;
  isMe: boolean;
}

export const PollCard: React.FC<PollCardProps> = ({
  poll,
  messageId,
  currentUser,
  allUsers,
  onVote,
  onClosePoll,
  isMe,
}) => {
  const [showVoterList, setShowVoterList] = useState(false);

  // Total unique votes
  const allVoterIds = Array.from(new Set(poll.options.flatMap((o) => o.votes)));
  const totalVotesCount = allVoterIds.length;

  const canClose = !poll.isClosed && (poll.createdBy === currentUser.id || currentUser.isAdmin || currentUser.isLeader);

  return (
    <div className="my-2 p-4 rounded-2xl bg-neutral-900/90 dark:bg-neutral-900/90 border border-neutral-700/60 dark:border-neutral-800 text-neutral-100 max-w-lg shadow-md transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300 shrink-0">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-neutral-400">
              {poll.isClosed ? 'Closed Poll' : 'Active Poll'}
            </span>
            <span className="text-[10px] text-neutral-500 ml-2 font-mono">
              {poll.isMultipleChoice ? 'Multiple choice' : 'Single vote'}
            </span>
          </div>
        </div>

        {canClose && (
          <button
            type="button"
            onClick={() => onClosePoll && onClosePoll(messageId)}
            className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors cursor-pointer"
            title="Close this poll to prevent further votes"
          >
            Close poll
          </button>
        )}
      </div>

      {/* Question */}
      <h4 className="text-sm font-semibold text-white mb-3 leading-snug">
        {poll.question}
      </h4>

      {/* Options List */}
      <div className="space-y-2">
        {poll.options.map((opt) => {
          const hasVoted = opt.votes.includes(currentUser.id);
          const voteCount = opt.votes.length;
          const percentage = totalVotesCount > 0 ? Math.round((voteCount / totalVotesCount) * 100) : 0;

          return (
            <div
              key={opt.id}
              className={`relative overflow-hidden rounded-xl border transition-all ${
                hasVoted
                  ? 'border-neutral-400 bg-neutral-800/80 text-white'
                  : 'border-neutral-700/60 bg-neutral-800/40 text-neutral-200 hover:border-neutral-600 hover:bg-neutral-800/60'
              } ${poll.isClosed ? 'cursor-default' : 'cursor-pointer'}`}
              onClick={() => {
                if (!poll.isClosed) {
                  onVote(messageId, opt.id);
                }
              }}
            >
              {/* Fill Progress Bar */}
              <div
                className={`absolute top-0 bottom-0 left-0 transition-all duration-300 ${
                  hasVoted ? 'bg-white/15' : 'bg-neutral-700/30'
                }`}
                style={{ width: `${percentage}%` }}
              />

              <div className="relative z-10 flex items-center justify-between p-2.5 px-3 select-none">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="shrink-0 text-neutral-300">
                    {poll.isMultipleChoice ? (
                      hasVoted ? (
                        <CheckSquare className="w-4 h-4 text-white" />
                      ) : (
                        <Square className="w-4 h-4 text-neutral-500" />
                      )
                    ) : (
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          hasVoted ? 'border-white bg-white' : 'border-neutral-500'
                        }`}
                      >
                        {hasVoted && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-medium truncate">{opt.text}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                  <span className="text-neutral-400">{percentage}%</span>
                  <span className="text-neutral-500 text-[10px]">({voteCount})</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer / Voter summary */}
      <div className="mt-3 pt-2.5 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
        <span>
          {totalVotesCount} {totalVotesCount === 1 ? 'person voted' : 'people voted'}
        </span>

        {totalVotesCount > 0 && (
          <button
            type="button"
            onClick={() => setShowVoterList((prev) => !prev)}
            className="hover:text-white transition-colors underline underline-offset-2"
          >
            {showVoterList ? 'Hide votes' : 'View votes'}
          </button>
        )}
      </div>

      {/* Expanded Voter List */}
      {showVoterList && totalVotesCount > 0 && (
        <div className="mt-2 p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-1.5 text-xs">
          {poll.options.map((opt) => {
            if (opt.votes.length === 0) return null;
            const voters = opt.votes
              .map((vid) => allUsers.find((u) => u.id === vid)?.displayName || 'User')
              .join(', ');

            return (
              <div key={opt.id} className="text-[11px]">
                <span className="font-semibold text-neutral-300">{opt.text}:</span>{' '}
                <span className="text-neutral-400">{voters}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
