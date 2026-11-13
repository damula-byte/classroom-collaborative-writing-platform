import { useState, useEffect } from 'react';
import { Group, Student } from '@/types';
import { subscribeToGroups, getStudentByUid } from '@/services';

export function useGroups(classId: string | null) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) {
      setGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeToGroups(classId, (g) => {
      setGroups(g);
      setLoading(false);
    });
    return unsub;
  }, [classId]);

  return { groups, loading };
}

export function useStudent(classId: string | null, uid: string | null) {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId || !uid) {
      setStudent(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    getStudentByUid(classId, uid).then((s) => {
      setStudent(s);
      setLoading(false);
    });
  }, [classId, uid]);

  return { student, loading };
}

export function useClassGroups(classIds: string[]) {
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (classIds.length === 0) {
      setAllGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribers: Array<() => void> = [];
    const loaded: Record<string, boolean> = {};
    let pending = classIds.length;

    classIds.forEach((classId) => {
      loaded[classId] = false;
      const unsub = subscribeToGroups(classId, (g) => {
        setAllGroups((prev) => {
          const filtered = prev.filter((pg) => pg.classId !== classId);
          return [...filtered, ...g];
        });
        if (!loaded[classId]) {
          loaded[classId] = true;
          pending--;
          if (pending === 0) setLoading(false);
        }
      });
      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach((u) => u());
  }, [classIds]);

  return { groups: allGroups, loading };
}
