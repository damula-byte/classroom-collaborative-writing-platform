import { cn } from '@/utils';

interface AvatarProps {
  name?: string | null;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'orange' | 'green' | 'slate' | 'blue';
  className?: string;
}

export function Avatar({
  name,
  size = 'md',
  variant = 'orange',
  className,
}: AvatarProps) {
  const initial = (name?.trim()?.charAt(0) || '?').toUpperCase();

  const sizeStyles = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  };

  const variantStyles = {
    orange: 'bg-orange-100 text-orange-700 border-orange-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full font-bold border select-none shrink-0',
        sizeStyles[size] || sizeStyles.md,
        variantStyles[variant] || variantStyles.orange,
        className
      )}
      title={name || undefined}
    >
      {initial}
    </div>
  );
}
