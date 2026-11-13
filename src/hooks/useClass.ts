import { useState, useEffect } from 'react';
import { Class } from '@/types';
import { subscribeToClass } from '@/services';

export function useClass(classId: string | null) {
  const [cls, setCls] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) {
      setCls(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeToClass(classId, (c) => {
      setCls(c);
      setLoading(false);
    });
    return unsub;
  }, [classId]);

  return { cls, loading };
}
