interface WordCounterProps {
  count: number;
  target?: number;
  className?: string;
}

export function WordCounter({ count, target, className }: WordCounterProps) {
  const percentage = target ? Math.min((count / target) * 100, 100) : 0;

  return (
    <div className={className}>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-slate-600">{count} words</span>
        {target && <span className="text-slate-400">Target: {target}</span>}
      </div>
      {target && (
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
