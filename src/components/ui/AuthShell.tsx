import { ReactNode } from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { BRANDING } from '@/config/branding';
import { cn } from '@/utils';

interface AuthShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  quote?: string;
  quoteAuthor?: string;
  className?: string;
}

export function AuthShell({
  children,
  title,
  subtitle,
  onBack,
  quote = '“Writing is thinking on paper—and the best thinking happens together.”',
  quoteAuthor = 'A focused, supportive space for every classroom writer.',
  className,
}: AuthShellProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  return (
    <div className={cn('grid min-h-screen lg:grid-cols-[1fr_1.1fr] bg-white font-sans', className)}>
      {/* Left Column: Form & Interaction */}
      <section className="flex min-h-screen flex-col justify-between px-6 py-8 sm:px-12 lg:px-16">
        <div>
          {/* Top navigation row */}
          <div className="flex items-center justify-between mb-8">
            <button
              type="button"
              onClick={handleBack}
              className="group inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition focus:outline-none"
            >
              <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
              <span>Back to Home</span>
            </button>
            <Logo productName={BRANDING.productName} size="sm" />
          </div>

          {/* Form Header */}
          <div className="mx-auto w-full max-w-md pt-4">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-sm sm:text-base leading-relaxed text-slate-500">
                {subtitle}
              </p>
            )}

            {/* Content Slot */}
            <div className="mt-8">{children}</div>
          </div>
        </div>

        {/* Subtle Footer info */}
        <div className="mx-auto w-full max-w-md pt-8 text-xs text-slate-400">
          {BRANDING.productName} · Educational Classroom Platform
        </div>
      </section>

      {/* Right Column: Visual Branded Panel (WriteSpace style) */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-green-700 via-green-800 to-emerald-900 lg:flex lg:flex-col lg:items-center lg:justify-center p-12 text-white select-none">
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 opacity-15 [background-image:radial-gradient(circle_at_center,white_1.5px,transparent_1.5px)] [background-size:24px_24px]" />
        
        {/* Ambient glow */}
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-orange-500/15 blur-3xl" />

        <div className="relative max-w-lg z-10">
          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md shadow-inner text-white">
            <BookOpen className="h-8 w-8 text-white" />
          </div>

          <blockquote className="text-3xl font-black leading-snug tracking-tight">
            {quote}
          </blockquote>

          <p className="mt-6 text-sm font-medium text-emerald-100 leading-relaxed">
            {quoteAuthor}
          </p>

          <div className="mt-10 flex items-center gap-3 border-t border-white/15 pt-6 text-xs font-semibold text-emerald-200">
            <span>✓ Safe & Anonymous Student Entry</span>
            <span>·</span>
            <span>✓ Google & Guest Ready</span>
          </div>
        </div>
      </section>
    </div>
  );
}
