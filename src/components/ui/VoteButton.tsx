import React from 'react';
import { Heart, Check, Lock } from 'lucide-react';
import { cn } from '@/utils';

interface VoteButtonProps {
  isOwnGroup: boolean;
  hasVoted: boolean;
  remainingVotes: number;
  isEligible: boolean;
  loading?: boolean;
  onVote: () => void;
}

export const VoteButton: React.FC<VoteButtonProps> = ({
  isOwnGroup,
  hasVoted,
  remainingVotes,
  isEligible,
  loading = false,
  onVote,
}) => {
  if (isOwnGroup) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">
        Your group
      </span>
    );
  }

  if (hasVoted) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700">
        <Check size={14} /> Vote given
      </span>
    );
  }

  if (!isEligible) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-400">
        <Lock size={13} /> Submit to vote
      </span>
    );
  }

  if (remainingVotes <= 0) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-400"
      >
        Limit reached
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={onVote}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-extrabold text-rose-700 transition hover:bg-rose-100 active:scale-[.98]'
      )}
    >
      <Heart size={14} className="fill-rose-500 text-rose-500" />
      {loading ? 'Voting...' : `Vote · ${remainingVotes} left`}
    </button>
  );
};

interface VoteCountProps {
  count: number;
  voterNames?: string[];
}

export const VoteCount: React.FC<VoteCountProps> = ({ count, voterNames = [] }) => {
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700"
      title={voterNames.length > 0 ? `Votes from: ${voterNames.join(', ')}` : 'No votes yet'}
    >
      <Heart size={13} className={count > 0 ? 'fill-rose-500 text-rose-500' : 'text-rose-400'} />
      <span>{count}</span>
      {voterNames.length > 0 && (
        <span className="hidden sm:inline text-[11px] font-medium text-rose-600/80 max-w-[140px] truncate">
          · {voterNames.join(', ')}
        </span>
      )}
    </div>
  );
};
