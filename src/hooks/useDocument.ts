import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Document, Annotation } from '@/types';
import { subscribeToAnnotations } from '@/services';

export function useDocument(groupId: string | null) {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setDocument(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = onSnapshot(doc(db, 'documents', groupId), (snap) => {
      if (snap.exists()) {
        setDocument({ id: snap.id, ...snap.data() } as Document);
      }
      setLoading(false);
    });
    return unsub;
  }, [groupId]);

  const update = useCallback(async (_data: Partial<Document>) => {
    // handled by service layer
  }, []);

  return { document, loading, update };
}

export function useAnnotations(groupId: string | null) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setAnnotations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeToAnnotations(groupId, (anns) => {
      setAnnotations(anns);
      setLoading(false);
    });
    return unsub;
  }, [groupId]);

  return { annotations, setAnnotations, loading };
}