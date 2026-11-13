import { useState, useEffect } from 'react';

interface QuotaMetrics {
  firestoreDocs: number;
  firestoreReads: number;
  firestoreWrites: number;
  rtdbBytes: number;
  rtdbOps: number;
  lastReset: number;
}

const FREE_TIER_LIMITS = {
  firestoreDocs: 50000,
  firestoreReads: 50000,
  firestoreWrites: 50000,
  rtdbBytes: 1024 * 1024 * 1024,
  rtdbOps: 100000,
};

export function useQuotaMonitor() {
  const [metrics, setMetrics] = useState<QuotaMetrics>({
    firestoreDocs: 0,
    firestoreReads: 0,
    firestoreWrites: 0,
    rtdbBytes: 0,
    rtdbOps: 0,
    lastReset: Date.now(),
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => ({ ...prev, lastReset: Date.now() }));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const getUsagePercent = (current: number, limit: number): number => {
    return Math.min((current / limit) * 100, 100);
  };

  const isNearLimit = (current: number, limit: number): boolean => {
    return (current / limit) * 100 > 80;
  };

  return { metrics, limits: FREE_TIER_LIMITS, getUsagePercent, isNearLimit };
}

export function QuotaWarning(props: { metrics: QuotaMetrics; limits: typeof FREE_TIER_LIMITS }) {
  const { metrics, limits } = props;
  const warnings: string[] = [];

  if (metrics.firestoreDocs > limits.firestoreDocs * 0.8) {
    warnings.push('Firestore documents at ' + Math.round((metrics.firestoreDocs / limits.firestoreDocs) * 100) + '%');
  }
  if (metrics.firestoreReads > limits.firestoreReads * 0.8) {
    warnings.push('Firestore reads at ' + Math.round((metrics.firestoreReads / limits.firestoreReads) * 100) + '%');
  }
  if (metrics.firestoreWrites > limits.firestoreWrites * 0.8) {
    warnings.push('Firestore writes at ' + Math.round((metrics.firestoreWrites / limits.firestoreWrites) * 100) + '%');
  }
  if (metrics.rtdbBytes > limits.rtdbBytes * 0.8) {
    warnings.push('RTDB storage at ' + Math.round((metrics.rtdbBytes / limits.rtdbBytes) * 100) + '%');
  }
  if (metrics.rtdbOps > limits.rtdbOps * 0.8) {
    warnings.push('RTDB operations at ' + Math.round((metrics.rtdbOps / limits.rtdbOps) * 100) + '%');
  }

  if (warnings.length === 0) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.73 1.289-.086 2.5-1.744 2.5H4.42c-1.66 0-2.475-1.21-1.744-2.5l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">Firebase Quota Warning</h3>
          <div className="mt-2 text-sm text-yellow-700">
            <ul className="list-disc list-inside space-y-1">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}