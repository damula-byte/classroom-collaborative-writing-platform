import { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/60 p-10 text-center shadow-xs sm:p-14',
        className
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 shadow-xs">
        {icon || <Inbox className="h-7 w-7" />}
      </div>
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-slate-500 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
