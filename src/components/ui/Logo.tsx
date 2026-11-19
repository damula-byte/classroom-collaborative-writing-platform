import { BookOpen } from 'lucide-react';
import { cn } from '@/utils';

interface LogoProps {
  productName?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({
  productName = 'Writing Classroom',
  size = 'md',
  className,
}: LogoProps) {
  const sizeStyles = {
    sm: {
      box: 'w-7 h-7 rounded-lg',
      icon: 'w-4 h-4',
      text: 'text-base',
    },
    md: {
      box: 'w-9 h-9 rounded-xl',
      icon: 'w-5 h-5',
      text: 'text-xl',
    },
    lg: {
      box: 'w-11 h-11 rounded-2xl',
      icon: 'w-6 h-6',
      text: 'text-2xl',
    },
  };

  const currentSize = sizeStyles[size] || sizeStyles.md;

  return (
    <div className={cn('inline-flex items-center gap-2.5 font-bold tracking-tight text-slate-900 select-none', className)}>
      <div className={cn('flex items-center justify-center bg-orange-500 text-white shadow-sm', currentSize.box)}>
        <BookOpen className={currentSize.icon} />
      </div>
      <span className={cn('font-extrabold', currentSize.text)}>
        {productName}
      </span>
    </div>
  );
}
