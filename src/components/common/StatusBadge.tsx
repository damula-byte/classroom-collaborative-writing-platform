import { cn } from '@/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    ARCHIVED: 'bg-slate-100 text-slate-600',
    WRITING: 'bg-blue-100 text-blue-700',
    SUBMITTED: 'bg-yellow-100 text-yellow-700',
    LOCKED: 'bg-red-100 text-red-700',
    REVIEWING: 'bg-purple-100 text-purple-700',
    REVIEWED: 'bg-green-100 text-green-700',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        styles[status] || 'bg-slate-100 text-slate-700',
        className
      )}
    >
      {status}
    </span>
  );
}
