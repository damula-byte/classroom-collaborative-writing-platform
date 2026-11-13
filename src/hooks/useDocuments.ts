import { useState, useEffect } from 'react';
import { Document } from '@/types';
import { getDocumentsByGroupIds, subscribeToDocuments } from '@/services';

export function useDocuments(groupIds: string[]) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (groupIds.length === 0) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeToDocuments(groupIds, (docs) => {
      setDocuments(docs);
      setLoading(false);
    });
    return unsub;
  }, [groupIds]);

  return { documents, loading };
}

export async function fetchDocuments(groupIds: string[]): Promise<Document[]> {
  return getDocumentsByGroupIds(groupIds);
}