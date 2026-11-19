import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/utils';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

interface ClassTimerProps {
  initialMinutes?: number;
  onStatusChange?: (status: TimerStatus) => void;
  className?: string;
  compact?: boolean;
}

export function ClassTimer({
  initialMinutes = 15,
  onStatusChange,
  className,
  compact = false,
}: ClassTimerProps) {
  // Configured duration in seconds (defaults to initialMinutes * 60)
  const [durationSeconds, setDurationSeconds] = useState(initialMinutes * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(initialMinutes * 60);
  const [status, setStatus] = useState<TimerStatus>('idle');

  // References to guarantee timestamp accuracy across tab backgrounding
  const targetTimestampRef = useRef<number | null>(null);
  const remainingAtPauseRef = useRef<number>(initialMinutes * 60);

  // Notify parent component of status updates
  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  // Main countdown loop using Date.now() timestamp comparisons
  useEffect(() => {
    if (status !== 'running') return;

    const tick = () => {
      if (!targetTimestampRef.current) return;
      const now = Date.now();
      const diffMs = targetTimestampRef.current - now;
      const diffSec = Math.max(0, Math.ceil(diffMs / 1000));

      setRemainingSeconds(diffSec);

      if (diffSec <= 0) {
        setStatus('finished');
        targetTimestampRef.current = null;
      }
    };

    // Run immediate check then interval
    tick();
    const interval = window.setInterval(tick, 200);

    return () => {
      window.clearInterval(interval);
    };
  }, [status]);

  // Handle duration preset selection when idle
  const handleSelectPreset = (minutes: number) => {
    if (status === 'running') return;
    const sec = minutes * 60;
    setDurationSeconds(sec);
    setRemainingSeconds(sec);
    remainingAtPauseRef.current = sec;
    setStatus('idle');
    targetTimestampRef.current = null;
  };

  // Timer controls
  const handleStart = () => {
    const target = Date.now() + remainingSeconds * 1000;
    targetTimestampRef.current = target;
    setStatus('running');
  };

  const handlePause = () => {
    if (status !== 'running') return;
    if (targetTimestampRef.current) {
      const diffMs = targetTimestampRef.current - Date.now();
      const diffSec = Math.max(0, Math.ceil(diffMs / 1000));
      remainingAtPauseRef.current = diffSec;
      setRemainingSeconds(diffSec);
    }
    targetTimestampRef.current = null;
    setStatus('paused');
  };

  const handleResume = () => {
    if (status !== 'paused') return;
    const target = Date.now() + remainingSeconds * 1000;
    targetTimestampRef.current = target;
    setStatus('running');
  };

  const handleReset = () => {
    targetTimestampRef.current = null;
    setRemainingSeconds(durationSeconds);
    remainingAtPauseRef.current = durationSeconds;
    setStatus('idle');
  };

  // Format MM:SS
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Pill visual styles per status
  const statusStyles = {
    idle: 'bg-slate-100 text-slate-700 border-slate-200',
    running: 'bg-orange-100 text-orange-800 border-orange-200 animate-pulse',
    paused: 'bg-sky-100 text-sky-800 border-sky-200',
    finished: 'bg-red-100 text-red-800 border-red-200',
  };

  if (compact) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-mono font-bold select-none',
          statusStyles[status],
          className
        )}
      >
        <Clock className="h-3.5 w-3.5" />
        <span>{status === 'finished' ? '00:00 · Time up' : formattedTime}</span>
        {status === 'paused' && <span className="text-[10px] uppercase font-sans">(Paused)</span>}
      </div>
    );
  }

  return (
    <div className={cn('rounded-3xl border border-slate-200 bg-white p-5 shadow-xs', className)}>
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Writing Session Timer</h3>
            <p className="text-[11px] text-slate-400">Classroom local countdown</p>
          </div>
        </div>

        {/* State Pill Badge */}
        <div
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-mono font-bold',
            statusStyles[status]
          )}
        >
          {status === 'finished' && <AlertCircle className="h-3.5 w-3.5 text-red-600" />}
          <span>
            {status === 'finished'
              ? "Time's up!"
              : status === 'paused'
              ? `${formattedTime} (Paused)`
              : status === 'running'
              ? `${formattedTime} (Running)`
              : `${formattedTime} (Ready)`}
          </span>
        </div>
      </div>

      {/* Main Countdown Centerpiece */}
      <div className="my-5 flex flex-col items-center justify-center py-2">
        <div
          className={cn(
            'text-5xl sm:text-6xl font-black font-mono tracking-tight select-none transition-colors duration-200',
            status === 'finished'
              ? 'text-red-600'
              : status === 'paused'
              ? 'text-sky-600'
              : status === 'running'
              ? 'text-orange-600'
              : 'text-slate-800'
          )}
        >
          {formattedTime}
        </div>

        {status === 'finished' && (
          <p className="mt-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
            Session finished. Time to wrap up ideas!
          </p>
        )}
      </div>

      {/* Presets Row (Only configurable when idle or reset) */}
      {status === 'idle' && (
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2 border-t border-slate-50 pt-3">
          <span className="text-xs text-slate-400 mr-1">Presets:</span>
          {[5, 10, 15, 20, 30].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleSelectPreset(m)}
              className={cn(
                'rounded-lg border px-2.5 py-1 text-xs font-bold transition focus:outline-none',
                durationSeconds === m * 60
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              {m}m
            </button>
          ))}
        </div>
      )}

      {/* Action Controls */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        {status === 'idle' && (
          <button
            type="button"
            onClick={handleStart}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 px-4 text-xs sm:text-sm font-extrabold text-white shadow-xs hover:bg-orange-600 transition active:scale-[.98]"
          >
            <Play className="h-4 w-4 fill-white" />
            <span>Start Writing Timer</span>
          </button>
        )}

        {status === 'running' && (
          <>
            <button
              type="button"
              onClick={handlePause}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 py-2.5 px-4 text-xs sm:text-sm font-extrabold text-white shadow-xs hover:bg-sky-700 transition active:scale-[.98]"
            >
              <Pause className="h-4 w-4" />
              <span>Pause</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
              title="Reset timer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </button>
          </>
        )}

        {status === 'paused' && (
          <>
            <button
              type="button"
              onClick={handleResume}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 px-4 text-xs sm:text-sm font-extrabold text-white shadow-xs hover:bg-orange-600 transition active:scale-[.98]"
            >
              <Play className="h-4 w-4 fill-white" />
              <span>Resume</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
              title="Reset timer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </button>
          </>
        )}

        {status === 'finished' && (
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white py-2.5 px-4 text-xs sm:text-sm font-extrabold text-slate-800 hover:bg-slate-50 transition"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset Timer for New Session</span>
          </button>
        )}
      </div>
    </div>
  );
}
