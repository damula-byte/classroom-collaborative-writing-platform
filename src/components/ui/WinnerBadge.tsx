import React from 'react';
import { Trophy } from 'lucide-react';

interface WinnerBadgeProps {
  className?: string;
}

export const WinnerBadge: React.FC<WinnerBadgeProps> = ({ className = '' }) => {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-extrabold text-amber-800 shadow-2xs ${className}`}
    >
      <Trophy size={13} className="text-amber-600" />
      Winner
    </span>
  );
};
