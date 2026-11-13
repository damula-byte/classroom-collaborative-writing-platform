import { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { rtdb } from '@/config/firebase';
import { PresenceEntry } from '@/types';

export function usePresence(classId: string | null, groupId: string | null, uid: string | null, name: string) {
  const [peers, setPeers] = useState<Record<string, PresenceEntry>>({});

  useEffect(() => {
    if (!classId || !groupId || !uid) return;

    const presenceRef = ref(rtdb, `classes/${classId}/presence/${groupId}`);
    const connectedRef = ref(rtdb, '.info/connected');

    const unsub = onValue(presenceRef, (snap) => {
      const val = snap.val() || {};
      setPeers(val);
    });

    const connUnsub = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        const selfRef = ref(rtdb, `classes/${classId}/presence/${groupId}/${uid}`);
        set(selfRef, { name, online: true, lastSeen: Date.now() });
      }
    });

    return () => {
      unsub();
      connUnsub();
    };
  }, [classId, groupId, uid, name]);

  return peers;
}

export function useGroupPresence(classId: string | null, groupId: string | null) {
  const [peers, setPeers] = useState<Record<string, PresenceEntry>>({});

  useEffect(() => {
    if (!classId || !groupId) return;

    const presenceRef = ref(rtdb, `classes/${classId}/presence/${groupId}`);
    const unsub = onValue(presenceRef, (snap) => {
      const val = snap.val() || {};
      setPeers(val);
    });

    return unsub;
  }, [classId, groupId]);

  return peers;
}