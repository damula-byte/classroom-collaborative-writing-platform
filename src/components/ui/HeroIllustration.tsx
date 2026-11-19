import { Sparkles, FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '@/utils';

interface HeroIllustrationProps {
  className?: string;
}

export function HeroIllustration({ className }: HeroIllustrationProps) {
  return (
    <div className={cn('relative w-full max-w-lg mx-auto select-none', className)}>
      {/* Decorative background glow */}
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-orange-400/20 via-amber-300/20 to-green-400/20 blur-xl" />

      {/* Main mockup card */}
      <div className="relative rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-2xl backdrop-blur-md">
        {/* Top header row */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
            <span className="ml-2 text-xs font-semibold text-slate-400">Class 10A · Group 2</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700 border border-green-200">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Live Writing
          </div>
        </div>

        {/* Mock Writing Document */}
        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600">
            <Sparkles className="h-4 w-4" />
            Topic: Climate Action Essay
          </div>

          <div className="rounded-2xl bg-slate-50/80 p-4 border border-slate-100">
            <p className="text-sm font-medium leading-relaxed text-slate-700">
              Renewable energy is no longer just an alternative; it is our primary opportunity to build a sustainable future. Through concerted global efforts and innovative technologies...
              <span className="inline-block h-4 w-0.5 ml-0.5 bg-orange-500 animate-pulse align-middle" />
            </p>
          </div>

          {/* Active collaborating peers pill */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center -space-x-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-orange-500 text-[11px] font-bold text-white shadow-xs">
                A
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-[11px] font-bold text-white shadow-xs">
                L
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-sky-500 text-[11px] font-bold text-white shadow-xs">
                M
              </div>
              <span className="pl-3 text-xs font-semibold text-slate-500">3 students active</span>
            </div>

            <div className="flex items-center gap-1 text-xs font-bold text-slate-400">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Saved
            </div>
          </div>
        </div>

        {/* Floating teacher feedback badge */}
        <div className="absolute -bottom-5 -right-3 sm:-right-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Teacher Note</p>
            <p className="text-[11px] text-slate-500">"Strong thesis statement!"</p>
          </div>
        </div>
      </div>
    </div>
  );
}
