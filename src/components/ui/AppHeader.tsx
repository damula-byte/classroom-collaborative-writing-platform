import { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { Logo } from './Logo';
import { Avatar } from './Avatar';
import { cn } from '@/utils';

interface AppHeaderProps {
  productName?: string;
  userName?: string | null;
  roleLabel?: string;
  roleVariant?: 'orange' | 'green' | 'slate' | 'blue';
  onLogout?: () => void | Promise<void>;
  rightActions?: ReactNode;
  breadcrumbs?: ReactNode;
  className?: string;
}

export function AppHeader({
  productName,
  userName,
  roleLabel = 'Teacher',
  roleVariant = 'orange',
  onLogout,
  rightActions,
  breadcrumbs,
  className,
}: AppHeaderProps) {
  const roleBadgeStyles = {
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  return (
    <header className={cn('sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-xs', className)}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 sm:gap-6">
          <Logo productName={productName} size="md" />
          {breadcrumbs && (
            <div className="hidden md:flex items-center text-sm text-slate-500">
              <span className="mx-2 text-slate-300">/</span>
              {breadcrumbs}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {rightActions}

          {(userName || roleLabel) && (
            <div className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-slate-50/80 py-1 pl-1.5 pr-3 shadow-xs">
              <Avatar name={userName || roleLabel} size="sm" variant={roleVariant} />
              <div className="flex items-center gap-2">
                {userName && (
                  <span className="max-w-[140px] truncate text-sm font-semibold text-slate-800">
                    {userName}
                  </span>
                )}
                {roleLabel && (
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider',
                      roleBadgeStyles[roleVariant] || roleBadgeStyles.orange
                    )}
                  >
                    {roleLabel}
                  </span>
                )}
              </div>
            </div>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center justify-center rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-200"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
