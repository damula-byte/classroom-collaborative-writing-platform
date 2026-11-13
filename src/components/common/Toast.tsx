import { ReactNode } from 'react';
import { CheckCircle, AlertCircle, XCircle, Info } from 'lucide-react';
import { cn } from '@/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose?: () => void;
}

const icons: Record<ToastType, ReactNode> = {
  success: <CheckCircle className='w-5 h-5' />,
  error: <XCircle className='w-5 h-5' />,
  warning: <AlertCircle className='w-5 h-5' />,
  info: <Info className='w-5 h-5' />,
};

const colors: Record<ToastType, string> = {
  success: 'bg-green-50 text-green-800 border-green-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
};

export function Toast({ message, type = 'info', onClose }: ToastProps) {
  return (
    <div className={cn('flex items-center gap-3 px-4 py-3 rounded-lg border', colors[type])}>
      {icons[type]}
      <span className='text-sm font-medium flex-1'>{message}</span>
      {onClose && (
        <button onClick={onClose} className='opacity-60 hover:opacity-100'>
          <XCircle className='w-4 h-4' />
        </button>
      )}
    </div>
  );
}
