import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/utils';

interface RoleCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'orange' | 'green';
  onClick: () => void;
  ctaText?: string;
  className?: string;
}

export function RoleCard({
  icon,
  title,
  description,
  color,
  onClick,
  ctaText,
  className,
}: RoleCardProps) {
  const isOrange = color === 'orange';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex min-h-44 w-full flex-col items-start rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl focus:outline-none focus:ring-4',
        isOrange ? 'focus:ring-orange-100' : 'focus:ring-green-100',
        className
      )}
    >
      <div
        className={cn(
          'mb-5 flex h-12 w-12 items-center justify-center rounded-2xl shadow-xs transition duration-200 group-hover:scale-105',
          isOrange ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-700'
        )}
      >
        {icon}
      </div>

      <div className="flex w-full items-center justify-between">
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900">{title}</h2>
        <div
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full transition group-hover:translate-x-1',
            isOrange ? 'text-orange-600 bg-orange-50' : 'text-green-700 bg-green-50'
          )}
        >
          <ChevronRight size={18} />
        </div>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>

      {ctaText && (
        <div
          className={cn(
            'mt-4 text-xs font-bold uppercase tracking-wider',
            isOrange ? 'text-orange-600' : 'text-green-700'
          )}
        >
          {ctaText} →
        </div>
      )}
    </button>
  );
}
