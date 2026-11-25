import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  Class,
  Group,
  Student,
  Document,
  Annotation,
  WritingComment,
  Vote,
  HighlightColor,
} from '@/types';
import {
  cleanDisplayName,
  clampMaxMembers,
  clampVotesPerStudent,
  normalizeName,
} from '@/utils';

function toMillis(val: unknown): number {
  if (typeof val === 'number') return val;
  if (val && typeof val === 'object' && 'toMillis' in val && typeof (val as { toMillis: () => number }).toMillis === 'function') {
    return (val as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function mapClassDoc(id: string, data: Record<string, unknown>): Class {
  return {
    ...(data as Omit<Class, 'id'>),
    id,
    votesPerStudent: clampVotesPerStudent((data.votesPerStudent as number | undefined) ?? 1),
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
    timerStartedAt: data.timerStartedAt ? toMillis(data.timerStartedAt) : null,
    timerEndsAt: data.timerEndsAt ? toMillis(data.timerEndsAt) : null,
    timerPausedAt: data.timerPausedAt ? toMillis(data.timerPausedAt) : null,
    timerFinalizedAt: data.timerFinalizedAt ? toMillis(data.timerFinalizedAt) : null,
  };
}

function mapGroupDoc(id: string, data: Record<string, unknown>): Group {
  return {
    ...(data as Omit<Group, 'id'>),
    id,
    maxMembers: clampMaxMembers((data.maxMembers as number | undefined) ?? 4),
    members: Array.isArray(data.members) ? data.members : [],
    createdAt: toMillis(data.createdAt),
    updatedAt: data.updatedAt ? toMillis(data.updatedAt) : undefined,
    submittedAt: data.submittedAt ? toMillis(data.submittedAt) : null,
    returnedAt: data.returnedAt ? toMillis(data.returnedAt) : null,
  };
}

// ---- Class Service ----
export async function createClass(data: {
  code: string;
  title: string;
  topic: string;
  teacherId: string;
  teacherName: string;
  allowStudentGroupSelection: boolean;
}): Promise<string> {
  const ref = await addDoc(collection(db, 'classes'), {
    ...data,
    status: 'ACTIVE',
    studentCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getClassById(classId: string): Promise<Class | null> {
  const snap = await getDoc(doc(db, 'classes', classId));
  return snap.exists() ? { id: snap.id, ...snap.data() } as Class : null;
}

export async function updateClass(classId: string, data: Partial<Class>): Promise<void> {
  await updateDoc(doc(db, 'classes', classId), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteClass(classId: string): Promise<void> {
  await deleteDoc(doc(db, 'classes', classId));
}

export function subscribeToClass(classId: string, cb: (cls: Class | null) => void) {
  return onSnapshot(doc(db, 'classes', classId), (snap) => {
    cb(snap.exists() ? { id: snap.id, ...snap.data() } as Class : null);
  });
}

export function subscribeToClasses(teacherId: string, cb: (classes: Class[]) => void) {
  const q = query(
    collection(db, 'classes'),
    where('teacherId', '==', teacherId)
  );
  return onSnapshot(q, (snap) => {
    const results = snap.docs.map(d => ({ id: d.id, ...d.data() } as Class));
    results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    cb(results);
  }, (err) => {
    console.error('subscribeToClasses error:', err);
    cb([]);
  });
}

export async function getClassByCode(code: string): Promise<Class | null> {
  const q = query(collection(db, 'classes'), where('code', '==', code.toUpperCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as Class;
}

// ---- Group Service ----
export async function createGroup(classId: string, name: string): Promise<string> {
  const ref = await addDoc(collection(db, `classes/${classId}/groups`), {
    classId,
    name,
    members: [],
    status: 'WRITING',
    locked: false,
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(db, 'documents', ref.id), {
    classId,
    groupId: ref.id,
    textContent: '',
    htmlContent: '',
    contentSnapshot: '',
    wordCount: 0,
    status: 'WRITING',
    locked: false,
    updatedBy: '',
    version: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getGroups(classId: string): Promise<Group[]> {
  const q = query(collection(db, `classes/${classId}/groups`), orderBy('createdAt'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Group));
}

export async function updateGroup(classId: string, groupId: string, data: Partial<Group>): Promise<void> {
  await updateDoc(doc(db, `classes/${classId}/groups`, groupId), data);
}

export function subscribeToGroups(
  classId: string,
  cb: (groups: Group[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, `classes/${classId}/groups`));
  return onSnapshot(q, (snap) => {
    const results = snap.docs.map(d => ({ id: d.id, ...d.data() } as Group));
    results.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    cb(results);
  }, (err) => {
    console.error('subscribeToGroups error:', err);
    onError?.(err);
  });
}

// ---- Student Service ----
export async function registerStudent(data: {
  uid: string;
  classId: string;
  groupId: string;
  name: string;
}): Promise<void> {
  await setDoc(doc(db, `classes/${data.classId}/students`, data.uid), {
    ...data,
    joinedAt: serverTimestamp(),
    lastSeenAt: serverTimestamp(),
  });
}

export async function getStudentByUid(classId: string, uid: string): Promise<Student | null> {
  const snap = await getDoc(doc(db, `classes/${classId}/students`, uid));
  return snap.exists() ? { uid: snap.id, ...snap.data() } as Student : null;
}

export async function getStudentCount(classId: string): Promise<number> {
  const q = query(collection(db, `classes/${classId}/students`));
  const snap = await getDocs(q);
  return snap.size;
}

export async function updateStudentLastSeen(classId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, `classes/${classId}/students`, uid), {
    lastSeenAt: serverTimestamp(),
  });
}

export async function updateStudentGroup(classId: string, uid: string, groupId: string): Promise<void> {
  await updateDoc(doc(db, `classes/${classId}/students`, uid), {
    groupId,
    lastSeenAt: serverTimestamp(),
  });
}

// ---- Document Service ----
export async function getDocument(groupId: string): Promise<Document | null> {
  const snap = await getDoc(doc(db, 'documents', groupId));
  return snap.exists() ? { id: snap.id, ...snap.data() } as Document : null;
}

export async function getDocumentsByGroupIds(groupIds: string[]): Promise<Document[]> {
  if (groupIds.length === 0) return [];
  const docs = await Promise.all(groupIds.map((id) => getDocument(id)));
  return docs.filter((d): d is Document => d !== null);
}

export function subscribeToDocuments(
  groupIds: string[],
  cb: (docs: Document[]) => void
) {
  if (groupIds.length === 0) {
    cb([]);
    return () => {};
  }
  const unsubscribers = groupIds.map((groupId) =>
    onSnapshot(doc(db, 'documents', groupId), (snap) => {
      if (snap.exists()) {
        cb([{ id: snap.id, ...snap.data() } as Document]);
      }
    })
  );
  return () => unsubscribers.forEach((u) => u());
}

export async function updateDocument(groupId: string, data: Partial<Document>): Promise<void> {
  await updateDoc(doc(db, 'documents', groupId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function createDocument(groupId: string, classId: string, initialText = ''): Promise<void> {
  await setDoc(doc(db, 'documents', groupId), {
    id: groupId,
    classId,
    groupId,
    textContent: initialText,
    htmlContent: '',
    contentSnapshot: '',
    wordCount: 0,
    status: 'WRITING',
    locked: false,
    updatedBy: '',
    version: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function subscribeToDocument(groupId: string, cb: (doc: Document | null) => void) {
  return onSnapshot(doc(db, 'documents', groupId), (snap) => {
    cb(snap.exists() ? { id: snap.id, ...snap.data() } as Document : null);
  });
}

// ---- Annotation Service ----
export async function createAnnotation(data: Partial<Annotation>): Promise<string> {
  const ref = await addDoc(collection(db, 'annotations'), {
    ...data,
    resolved: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAnnotation(annotationId: string, data: Partial<Annotation>): Promise<void> {
  await updateDoc(doc(db, 'annotations', annotationId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAnnotation(annotationId: string): Promise<void> {
  await deleteDoc(doc(db, 'annotations', annotationId));
}

export async function resolveAnnotation(annotationId: string): Promise<void> {
  await updateAnnotation(annotationId, { resolved: true });
}

export async function setDocumentStatus(groupId: string, status: Document['status']): Promise<void> {
  await updateDocument(groupId, { status });
}

export function subscribeToAnnotations(
  groupId: string,
  cb: (annotations: Annotation[]) => void
) {
  const q = query(
    collection(db, 'annotations'),
    where('groupId', '==', groupId)
  );
  return onSnapshot(q, (snap) => {
    const results = snap.docs.map(d => ({ id: d.id, ...d.data() } as Annotation));
    results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    cb(results);
  });
}

// ---- Batch operations ----
export async function batchSetDocuments(updates: Array<{
  groupId: string;
  data: Partial<Document>;
}>): Promise<void> {
  const batch = writeBatch(db);
  updates.forEach(({ groupId, data }) => {
    batch.update(doc(db, 'documents', groupId), { ...data, updatedAt: serverTimestamp() });
  });
  await batch.commit();
}

// ---- Document Lifecycle State Machine ----
export type DocStatus = 'WRITING' | 'SUBMITTED' | 'LOCKED' | 'REVIEWING' | 'REVIEWED';

export const STATUS_TRANSITIONS: Record<DocStatus, DocStatus[]> = {
  WRITING: ['SUBMITTED', 'LOCKED'],
  SUBMITTED: ['REVIEWING', 'LOCKED', 'WRITING'],
  LOCKED: ['REVIEWING', 'WRITING'],
  REVIEWING: ['REVIEWED', 'LOCKED', 'WRITING'],
  REVIEWED: ['LOCKED', 'WRITING'],
};

export function canTransition(from: DocStatus, to: DocStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function transitionDocumentStatus(
  groupId: string,
  from: DocStatus,
  to: DocStatus
): Promise<void> {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid status transition: ${from} -> ${to}`);
  }
  const docData = await getDocument(groupId);
  if (!docData) throw new Error('Document not found');
  await updateDocument(groupId, {
    status: to,
    locked: to === 'LOCKED',
    version: docData.version + 1,
  });
  if (docData.classId) {
    await updateDoc(doc(db, `classes/${docData.classId}/groups`, groupId), {
      status: to,
      locked: to === 'LOCKED',
      updatedAt: serverTimestamp(),
    });
  }
}

export async function submitDocument(groupId: string): Promise<void> {
  const doc = await getDocument(groupId);
  if (!doc) throw new Error('Document not found');
  if (doc.status !== 'WRITING') throw new Error(`Cannot submit from status: ${doc.status}`);
  await transitionDocumentStatus(groupId, 'WRITING', 'SUBMITTED');
}

export async function startReview(groupId: string): Promise<void> {
  const doc = await getDocument(groupId);
  if (!doc) throw new Error('Document not found');
  const allowed: DocStatus[] = ['SUBMITTED', 'LOCKED'];
  if (!allowed.includes(doc.status)) throw new Error(`Cannot review from status: ${doc.status}`);
  await transitionDocumentStatus(groupId, doc.status, 'REVIEWING');
}

export async function completeReview(groupId: string): Promise<void> {
  const doc = await getDocument(groupId);
  if (!doc) throw new Error('Document not found');
  if (doc.status !== 'REVIEWING') throw new Error(`Cannot complete review from status: ${doc.status}`);
  await transitionDocumentStatus(groupId, 'REVIEWING', 'REVIEWED');
}

export async function lockDocumentState(groupId: string): Promise<void> {
  const doc = await getDocument(groupId);
  if (!doc) throw new Error('Document not found');
  if (doc.status === 'LOCKED') throw new Error('Document already locked');
  await transitionDocumentStatus(groupId, doc.status, 'LOCKED');
}

export async function unlockDocumentState(groupId: string): Promise<void> {
  const doc = await getDocument(groupId);
  if (!doc) throw new Error('Document not found');
  if (doc.status !== 'LOCKED') throw new Error('Document not locked');
  await transitionDocumentStatus(groupId, 'LOCKED', 'WRITING');
}

export async function resetDocumentToWriting(groupId: string): Promise<void> {
  const doc = await getDocument(groupId);
  if (!doc) throw new Error('Document not found');
  if (doc.status === 'WRITING') throw new Error('Document already in WRITING state');
  await transitionDocumentStatus(groupId, doc.status, 'WRITING');
}

// ============================================================
// WriteSpace Extensions (Phase 1)
// ============================================================

export async function createWriteSpaceClass(data: {
  code: string;
  title: string;
  topic?: string;
  teacherId: string;
  teacherName: string;
  votesPerStudent?: number;
  timerDurationSeconds?: number;
}): Promise<string> {
  const normalizedCode = data.code.trim().toUpperCase();
  const existing = await getClassByCode(normalizedCode);
  if (existing) {
    throw new Error('Class code collision. Please retry.');
  }
  const ref = await addDoc(collection(db, 'classes'), {
    code: normalizedCode,
    title: cleanDisplayName(data.title, 120),
    topic: cleanDisplayName(data.topic ?? '', 240),
    teacherId: data.teacherId,
    teacherName: cleanDisplayName(data.teacherName, 60),
    status: 'ACTIVE',
    allowStudentGroupSelection: true,
    studentCount: 0,
    votesPerStudent: clampVotesPerStudent(data.votesPerStudent ?? 1),
    timerDurationSeconds: data.timerDurationSeconds ?? 900,
    timerStartedAt: null,
    timerEndsAt: null,
    timerPausedAt: null,
    timerRemainingSeconds: null,
    timerFinalizedAt: null,
    timerRunId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function createWriteSpaceGroup(
  classId: string,
  data: { name: string; prompt?: string; maxMembers?: number }
): Promise<string> {
  const maxMembers = clampMaxMembers(data.maxMembers ?? 4);
  const groupRef = doc(collection(db, `classes/${classId}/groups`));
  const batch = writeBatch(db);
  batch.set(groupRef, {
    classId,
    name: cleanDisplayName(data.name, 80),
    prompt: (data.prompt ?? '').trim().slice(0, 500),
    maxMembers,
    members: [],
    status: 'WRITING',
    locked: false,
    submittedAt: null,
    returnedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, 'documents', groupRef.id), {
    id: groupRef.id,
    classId,
    groupId: groupRef.id,
    textContent: '',
    htmlContent: '',
    contentSnapshot: '',
    wordCount: 0,
    status: 'WRITING',
    locked: false,
    updatedBy: '',
    version: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return groupRef.id;
}

export async function joinGroupAtomic(
  classId: string,
  groupId: string,
  studentUid: string,
  studentName: string
): Promise<void> {
  const cleanName = cleanDisplayName(studentName, 60);
  const normName = normalizeName(cleanName);
  if (cleanName.length < 2) {
    throw new Error('Your name must be at least 2 characters.');
  }

  const classRef = doc(db, 'classes', classId);
  const groupRef = doc(db, `classes/${classId}/groups`, groupId);
  const studentRef = doc(db, `classes/${classId}/students`, studentUid);

  await runTransaction(db, async (tx) => {
    const [classSnap, groupSnap] = await Promise.all([tx.get(classRef), tx.get(groupRef)]);
    if (!classSnap.exists()) throw new Error('Classroom not found.');
    if (!groupSnap.exists()) throw new Error('Writing group not found.');

    const cls = mapClassDoc(classSnap.id, classSnap.data());
    const group = mapGroupDoc(groupSnap.id, groupSnap.data());

    if (group.status !== 'WRITING' || group.locked) {
      throw new Error('This group has already submitted its writing.');
    }
    if (cls.timerEndsAt && !cls.timerPausedAt && Date.now() >= cls.timerEndsAt) {
      throw new Error('Writing time has expired.');
    }

    const members = [...group.members];
    const existingByUid = members.find((m) => m.uid === studentUid);
    if (existingByUid) {
      // Idempotent reconnect
      tx.set(
        studentRef,
        {
          uid: studentUid,
          classId,
          groupId,
          name: cleanName,
          lastSeenAt: serverTimestamp(),
        },
        { merge: true }
      );
      return;
    }

    const maxMembers = clampMaxMembers(group.maxMembers ?? 4);
    if (members.length >= maxMembers) {
      throw new Error(`This group is full (${maxMembers}/${maxMembers} members).`);
    }

    const duplicateName = members.some(
      (m) => (m.normalizedName ?? normalizeName(m.name)) === normName
    );
    if (duplicateName) {
      throw new Error('Another student with this name is already in this group.');
    }

    members.push({
      uid: studentUid,
      name: cleanName,
      normalizedName: normName,
      joinedAt: Date.now(),
    });

    tx.update(groupRef, {
      members,
      updatedAt: serverTimestamp(),
    });
    tx.set(
      studentRef,
      {
        uid: studentUid,
        classId,
        groupId,
        name: cleanName,
        joinedAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export async function updateGroupCapacity(
  classId: string,
  groupId: string,
  nextCapacity: number
): Promise<void> {
  const clamped = clampMaxMembers(nextCapacity);
  const groupRef = doc(db, `classes/${classId}/groups`, groupId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(groupRef);
    if (!snap.exists()) throw new Error('Writing group not found.');
    const group = mapGroupDoc(snap.id, snap.data());
    if (clamped < group.members.length) {
      throw new Error(
        `Capacity cannot be less than current member count (${group.members.length}).`
      );
    }
    tx.update(groupRef, { maxMembers: clamped, updatedAt: serverTimestamp() });
  });
}

export async function removeGroupMember(
  classId: string,
  groupId: string,
  memberUid: string
): Promise<void> {
  const groupRef = doc(db, `classes/${classId}/groups`, groupId);
  const studentRef = doc(db, `classes/${classId}/students`, memberUid);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(groupRef);
    if (!snap.exists()) throw new Error('Writing group not found.');
    const group = mapGroupDoc(snap.id, snap.data());
    const nextMembers = group.members.filter((m) => m.uid !== memberUid);
    tx.update(groupRef, { members: nextMembers, updatedAt: serverTimestamp() });
    tx.set(
      studentRef,
      {
        groupId: '',
        lastSeenAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export async function returnToStudents(classId: string, groupId: string): Promise<void> {
  const groupRef = doc(db, `classes/${classId}/groups`, groupId);
  const docRef = doc(db, 'documents', groupId);

  await runTransaction(db, async (tx) => {
    const [groupSnap, docSnap] = await Promise.all([tx.get(groupRef), tx.get(docRef)]);
    if (!groupSnap.exists()) throw new Error('Writing group not found.');
    const currentVersion = docSnap.exists() ? (docSnap.data().version as number) || 1 : 1;

    tx.update(groupRef, {
      status: 'WRITING',
      locked: false,
      returnedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (docSnap.exists()) {
      tx.update(docRef, {
        status: 'WRITING',
        locked: false,
        version: currentVersion + 1,
        updatedAt: serverTimestamp(),
      });
    }
  });
}

export async function deleteGroupSafely(classId: string, groupId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, `classes/${classId}/groups`, groupId));
  batch.delete(doc(db, 'documents', groupId));
  await batch.commit();
}

export async function deleteClassSafely(classId: string): Promise<void> {
  const groupsSnap = await getDocs(collection(db, `classes/${classId}/groups`));
  const batch = writeBatch(db);
  groupsSnap.docs.forEach((g) => {
    batch.delete(g.ref);
    batch.delete(doc(db, 'documents', g.id));
  });
  batch.delete(doc(db, 'classes', classId));
  await batch.commit();
}

// ---- Comments & Highlights (WriteSpace Review) ----

export async function createWritingComment(data: {
  classId: string;
  groupId: string;
  authorId: string;
  authorName: string;
  authorRole: 'teacher' | 'student';
  body: string;
  parentId?: string | null;
  selectedText?: string | null;
  highlightColor?: HighlightColor | null;
  anchorStart?: number | null;
  anchorEnd?: number | null;
  documentRevision?: number | null;
}): Promise<string> {
  const cleanBody = data.body.trim().slice(0, 2000);
  if (!cleanBody) throw new Error('Comment cannot be empty.');

  const cleanQuote = data.selectedText ? data.selectedText.trim().slice(0, 500) : null;
  const ref = await addDoc(collection(db, 'comments'), {
    classId: data.classId,
    groupId: data.groupId,
    authorId: data.authorId,
    authorName: cleanDisplayName(data.authorName, 60),
    authorRole: data.authorRole,
    body: cleanBody,
    parentId: data.parentId ?? null,
    selectedText: cleanQuote,
    highlightColor: cleanQuote ? data.highlightColor ?? 'orange' : null,
    anchorStart: data.anchorStart ?? null,
    anchorEnd: data.anchorEnd ?? null,
    documentRevision: data.documentRevision ?? null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export function subscribeToWritingComments(
  groupId: string,
  cb: (comments: WritingComment[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, 'comments'), where('groupId', '==', groupId));
  return onSnapshot(
    q,
    (snap) => {
      const results: WritingComment[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          classId: data.classId,
          groupId: data.groupId,
          authorId: data.authorId,
          authorName: data.authorName,
          authorRole: data.authorRole,
          body: data.body,
          parentId: data.parentId ?? null,
          selectedText: data.selectedText ?? null,
          highlightColor: data.highlightColor ?? null,
          anchorStart: data.anchorStart ?? null,
          anchorEnd: data.anchorEnd ?? null,
          documentRevision: data.documentRevision ?? null,
          createdAt: toMillis(data.createdAt),
        };
      });
      results.sort((a, b) => a.createdAt - b.createdAt);
      cb(results);
    },
    (err) => {
      console.error('subscribeToWritingComments error:', err);
      onError?.(err);
    }
  );
}

// ---- Voting (Atomic Quota Enforcement) ----

export async function castVoteAtomic(params: {
  classId: string;
  groupId: string;
  voterUid: string;
  voterName: string;
}): Promise<void> {
  const { classId, groupId, voterUid, voterName } = params;
  const classRef = doc(db, 'classes', classId);
  const groupRef = doc(db, `classes/${classId}/groups`, groupId);
  const voteId = `${voterUid}_${groupId}`;
  const voteRef = doc(db, `classes/${classId}/votes`, voteId);
  const quotaRef = doc(db, `classes/${classId}/voterQuotas`, voterUid);

  await runTransaction(db, async (tx) => {
    const [classSnap, groupSnap, voteSnap, quotaSnap] = await Promise.all([
      tx.get(classRef),
      tx.get(groupRef),
      tx.get(voteRef),
      tx.get(quotaRef),
    ]);

    if (!classSnap.exists()) throw new Error('Classroom not found.');
    if (!groupSnap.exists()) throw new Error('Writing group not found.');

    const cls = mapClassDoc(classSnap.id, classSnap.data());
    const group = mapGroupDoc(groupSnap.id, groupSnap.data());

    if (group.status !== 'SUBMITTED' && group.status !== 'REVIEWING' && group.status !== 'REVIEWED') {
      throw new Error('Votes can only be given to submitted writing.');
    }
    if (group.members.some((m) => m.uid === voterUid)) {
      throw new Error('Students cannot vote for their own group.');
    }
    if (voteSnap.exists()) {
      throw new Error('You have already voted for this group.');
    }

    const currentCount = quotaSnap.exists() ? (quotaSnap.data().count as number) || 0 : 0;
    const maxVotes = clampVotesPerStudent(cls.votesPerStudent ?? 1);
    if (currentCount >= maxVotes) {
      throw new Error(`You have used all ${maxVotes} of your votes.`);
    }

    tx.set(voteRef, {
      classId,
      groupId,
      voterUid,
      voterName: cleanDisplayName(voterName, 60),
      createdAt: serverTimestamp(),
    });
    tx.set(
      quotaRef,
      {
        uid: voterUid,
        classId,
        count: currentCount + 1,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export function subscribeToVotes(
  classId: string,
  cb: (votes: Vote[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, `classes/${classId}/votes`));
  return onSnapshot(
    q,
    (snap) => {
      const results: Vote[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          classId: data.classId,
          groupId: data.groupId,
          voterUid: data.voterUid,
          voterName: data.voterName,
          createdAt: toMillis(data.createdAt),
        };
      });
      results.sort((a, b) => a.createdAt - b.createdAt);
      cb(results);
    },
    (err) => {
      console.error('subscribeToVotes error:', err);
      onError?.(err);
    }
  );
}

// ---- Synchronized Timer ----

export async function startClassTimer(classId: string, durationSeconds: number): Promise<void> {
  const safeDuration = Math.max(10, Math.min(7200, Math.floor(durationSeconds)));
  const now = Date.now();
  const runId = `${now}_${Math.random().toString(36).slice(2, 8)}`;
  await updateDoc(doc(db, 'classes', classId), {
    timerDurationSeconds: safeDuration,
    timerStartedAt: now,
    timerEndsAt: now + safeDuration * 1000,
    timerPausedAt: null,
    timerRemainingSeconds: safeDuration,
    timerFinalizedAt: null,
    timerRunId: runId,
    updatedAt: serverTimestamp(),
  });
}

export async function pauseClassTimer(classId: string, remainingSeconds: number): Promise<void> {
  const safeRemaining = Math.max(0, Math.floor(remainingSeconds));
  await updateDoc(doc(db, 'classes', classId), {
    timerPausedAt: Date.now(),
    timerRemainingSeconds: safeRemaining,
    updatedAt: serverTimestamp(),
  });
}

export async function resumeClassTimer(classId: string, remainingSeconds: number): Promise<void> {
  const safeRemaining = Math.max(1, Math.floor(remainingSeconds));
  const now = Date.now();
  await updateDoc(doc(db, 'classes', classId), {
    timerPausedAt: null,
    timerEndsAt: now + safeRemaining * 1000,
    timerRemainingSeconds: safeRemaining,
    updatedAt: serverTimestamp(),
  });
}

export async function resetClassTimer(classId: string, durationSeconds?: number): Promise<void> {
  await updateDoc(doc(db, 'classes', classId), {
    timerStartedAt: null,
    timerEndsAt: null,
    timerPausedAt: null,
    timerRemainingSeconds: null,
    timerFinalizedAt: null,
    timerRunId: null,
    ...(typeof durationSeconds === 'number'
      ? { timerDurationSeconds: Math.max(10, Math.min(7200, Math.floor(durationSeconds))) }
      : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function finalizeExpiredTimerIdempotent(classId: string): Promise<void> {
  const classRef = doc(db, 'classes', classId);
  const classSnap = await getDoc(classRef);
  if (!classSnap.exists()) return;
  const cls = mapClassDoc(classSnap.id, classSnap.data());
  if (!cls.timerEndsAt || cls.timerPausedAt) return;
  if (Date.now() < cls.timerEndsAt) return;
  if (cls.timerFinalizedAt && cls.timerFinalizedAt >= cls.timerEndsAt) return;

  const groupsSnap = await getDocs(
    query(collection(db, `classes/${classId}/groups`), where('status', '==', 'WRITING'))
  );
  const batch = writeBatch(db);
  groupsSnap.docs.forEach((g) => {
    batch.update(g.ref, {
      status: 'SUBMITTED',
      locked: true,
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'documents', g.id), {
      status: 'SUBMITTED',
      locked: true,
      updatedAt: serverTimestamp(),
    });
  });
  batch.update(classRef, {
    timerFinalizedAt: Date.now(),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}
