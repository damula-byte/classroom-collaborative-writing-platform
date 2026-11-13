import { useState, useEffect, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import { ref, set, onValue, off } from 'firebase/database';
import { rtdb } from '@/config/firebase';

interface CollaborationState {
  synced: boolean;
  peers: Record<string, { name: string; color: string }>;
}

export function useCollaboration(
  groupId: string | null,
  classId: string | null,
  ydoc: Y.Doc | null
) {
  const [state, setState] = useState<CollaborationState>({
    synced: false,
    peers: {},
  });

  useEffect(() => {
    if (!ydoc || !groupId || !classId) return;

    const updatesPath = `classes/${classId}/live/${groupId}/updates`;
    const awarenessPath = `classes/${classId}/live/${groupId}/awareness`;

    // Subscribe to incoming Yjs updates from RTDB
    const updatesRef = ref(rtdb, updatesPath);
    const handleUpdate = (snap: any) => {
      const val = snap.val();
      if (val && val.delta) {
        try {
          const delta = Uint8Array.from(val.delta);
          Y.applyUpdate(ydoc, delta);
        } catch (err) {
          console.error('Failed to apply remote update:', err);
        }
      }
    };
    onValue(updatesRef, handleUpdate);

    // Broadcast local Yjs updates to RTDB
    const broadcastUpdate = (update: Uint8Array) => {
      set(ref(rtdb, updatesPath), {
        delta: Array.from(update),
        ts: Date.now(),
      }).catch(console.error);
    };
    ydoc.on('update', broadcastUpdate);

    // Subscribe to awareness (peer cursors)
    const awarenessRef = ref(rtdb, awarenessPath);
    const handleAwareness = (snap: any) => {
      const val = snap.val() || {};
      setState((prev) => ({ ...prev, peers: val }));
    };
    onValue(awarenessRef, handleAwareness);

    setState((prev) => ({ ...prev, synced: true }));

    return () => {
      ydoc.off('update', broadcastUpdate);
      off(updatesRef, 'value', handleUpdate);
      off(awarenessRef, 'value', handleAwareness);
    };
  }, [ydoc, groupId, classId]);

  const broadcastDelta = useCallback((delta: Uint8Array) => {
    if (!ydoc || !groupId || !classId) return;
    const updatesRef = ref(rtdb, `classes/${classId}/live/${groupId}/updates`);
    set(updatesRef, {
      delta: Array.from(delta),
      ts: Date.now(),
    });
  }, [ydoc, groupId, classId]);

  const setPresence = useCallback((data: { name: string; color: string }) => {
    if (!ydoc || !groupId || !classId) return;
    const presenceRef = ref(rtdb, `classes/${classId}/live/${groupId}/awareness`);
    set(presenceRef, data);
  }, [ydoc, groupId, classId]);

  return { ...state, broadcastDelta, setPresence };
}

export function useYDoc(groupId: string | null | undefined): Y.Doc | null {
  const docRef = useRef<Y.Doc | null>(null);

  if (!groupId) return null;

  if (!docRef.current) {
    docRef.current = new Y.Doc();
  }

  useEffect(() => {
    return () => {
      if (docRef.current) {
        docRef.current.destroy();
        docRef.current = null;
      }
    };
  }, [groupId]);

  return docRef.current;
}