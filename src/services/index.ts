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
  ChecklistCriterion,
  ChecklistVersion,
  PeerReviewDraft,
  PeerReviewPublished,
  ChecklistResponse,
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
    memberIds: Array.isArray(data.memberIds) ? data.memberIds as string[] : undefined,
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
    memberIds: [],
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
    memberIds: [],
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
      tx.update(
        groupRef,
        {
          memberIds: Array.from(new Set([...(group.memberIds ?? []), studentUid])),
          updatedAt: serverTimestamp(),
        }
      );
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
      memberIds: [...(Array.isArray(group.memberIds) ? group.memberIds : []), studentUid],
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
    tx.update(groupRef, {
      members: nextMembers,
      memberIds: (group.memberIds ?? nextMembers.map((m) => m.uid)).filter((uid) => uid !== memberUid),
      updatedAt: serverTimestamp(),
    });
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

  for (const collectionName of ['peerReviewDrafts', 'peerReviews'] as const) {
    const snap = await getDocs(collection(db, `classes/${classId}/${collectionName}`));
    for (const reviewSnap of snap.docs) {
      const data = reviewSnap.data();
      if (data.reviewerGroupId === groupId || data.targetGroupId === groupId) {
        const responses = await getDocs(collection(reviewSnap.ref, 'responses'));
        responses.docs.forEach((response) => batch.delete(response.ref));
        batch.delete(reviewSnap.ref);
      }
    }
  }
  await batch.commit();
}

export async function deleteClassSafely(classId: string): Promise<void> {
  const groupsSnap = await getDocs(collection(db, `classes/${classId}/groups`));
  const batch = writeBatch(db);
  for (const collectionName of [
    'peerReviewDrafts',
    'peerReviews',
    'checklistVersions',
  ] as const) {
    const snap = await getDocs(collection(db, `classes/${classId}/${collectionName}`));
    snap.docs.forEach((item) => batch.delete(item.ref));
  }
  const draftSnap = await getDocs(collection(db, `classes/${classId}/peerReviewDrafts`));
  for (const draft of draftSnap.docs) {
    const responses = await getDocs(collection(draft.ref, 'responses'));
    responses.docs.forEach((response) => batch.delete(response.ref));
  }
  const publishedSnap = await getDocs(collection(db, `classes/${classId}/peerReviews`));
  for (const published of publishedSnap.docs) {
    const responses = await getDocs(collection(published.ref, 'responses'));
    responses.docs.forEach((response) => batch.delete(response.ref));
  }
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
    updatedAt: serverTimestamp(),
    editedAt: null,
    status: 'open',
    resolvedAt: null,
    resolvedBy: null,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
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
      const deletedRootIds = new Set(
        snap.docs
          .filter((d) => d.data().isDeleted === true)
          .map((d) => d.id)
      );
      const results: WritingComment[] = snap.docs
        .filter((d) => d.data().isDeleted !== true)
        .filter((d) => !d.data().parentId || !deletedRootIds.has(d.data().parentId))
        .map((d) => {
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
          updatedAt: data.updatedAt ? toMillis(data.updatedAt) : undefined,
          editedAt: data.editedAt ? toMillis(data.editedAt) : null,
          status: data.status === 'resolved' ? 'resolved' : 'open',
          resolvedAt: data.resolvedAt ? toMillis(data.resolvedAt) : null,
          resolvedBy: data.resolvedBy ?? null,
          isDeleted: data.isDeleted === true,
          deletedAt: data.deletedAt ? toMillis(data.deletedAt) : null,
          deletedBy: data.deletedBy ?? null,
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

export async function updateWritingComment(
  commentId: string,
  body: string
): Promise<void> {
  const cleanBody = body.trim().slice(0, 2000);
  if (!cleanBody) throw new Error('Comment cannot be empty.');
  await updateDoc(doc(db, 'comments', commentId), {
    body: cleanBody,
    editedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteWritingReply(commentId: string): Promise<void> {
  await deleteDoc(doc(db, 'comments', commentId));
}

export async function softDeleteWritingComment(commentId: string, uid: string): Promise<void> {
  const ref = doc(db, 'comments', commentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Comment not found.');
  const data = snap.data();
  if (data.parentId) throw new Error('Use reply deletion for a reply.');
  await updateDoc(ref, {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: uid,
    updatedAt: serverTimestamp(),
  });
}

export async function resolveWritingComment(
  commentId: string,
  uid: string
): Promise<void> {
  await updateDoc(doc(db, 'comments', commentId), {
    status: 'resolved',
    resolvedAt: serverTimestamp(),
    resolvedBy: uid,
    updatedAt: serverTimestamp(),
  });
}

export async function reopenWritingComment(commentId: string): Promise<void> {
  await updateDoc(doc(db, 'comments', commentId), {
    status: 'open',
    resolvedAt: null,
    resolvedBy: null,
    updatedAt: serverTimestamp(),
  });
}

export function getPeerReviewPairId(
  reviewerGroupId: string,
  targetGroupId: string
): string {
  return `${reviewerGroupId}__${targetGroupId}`;
}

export async function savePeerReviewChecklist(
  classId: string,
  criteria: Array<{ criterionId?: string; text: string; order: number }>,
  uid: string
): Promise<string> {
  const trimmed = criteria.map((criterion, index) => ({
    criterionId: criterion.criterionId?.trim() || `criterion-${doc(collection(db, `classes/${classId}/checklistVersions`)).id}`,
    text: criterion.text.trim(),
    order: Number.isFinite(criterion.order) ? criterion.order : index,
  })).map((criterion, index) => ({ ...criterion, order: index }));

  if (trimmed.length === 0) throw new Error('At least one checklist criterion is required.');
  if (trimmed.some((criterion) => !criterion.text)) {
    throw new Error('Checklist criterion text cannot be empty.');
  }
  if (new Set(trimmed.map((criterion) => criterion.criterionId)).size !== trimmed.length) {
    throw new Error('Checklist criterion IDs must be unique.');
  }

  const configRef = doc(db, `classes/${classId}/peerReviewChecklist`, 'active');
  const versionRef = doc(collection(db, `classes/${classId}/checklistVersions`));
  let savedVersionId = versionRef.id;

  await runTransaction(db, async (tx) => {
    const configSnap = await tx.get(configRef);
    const activeVersionId =
      configSnap.exists()
        ? configSnap.data().activeVersionId as string | undefined
        : undefined;

    if (activeVersionId) {
      const activeVersionSnap = await tx.get(
        doc(db, `classes/${classId}/checklistVersions`, activeVersionId)
      );
      if (activeVersionSnap.exists()) {
        const activeCriteria = activeVersionSnap.data().criteria;
        if (
          Array.isArray(activeCriteria) &&
          activeCriteria.length === trimmed.length &&
          activeCriteria.every((criterion: ChecklistCriterion, index: number) =>
            criterion.criterionId === trimmed[index].criterionId &&
            criterion.text === trimmed[index].text &&
            criterion.order === trimmed[index].order
          )
        ) {
          savedVersionId = activeVersionId;
          return;
        }
      }
    }

    const nextVersionNumber =
      configSnap.exists() ? ((configSnap.data().versionNumber as number) || 0) + 1 : 1;

    tx.set(versionRef, {
      id: versionRef.id,
      classId,
      versionNumber: nextVersionNumber,
      criteria: trimmed,
      criterionIds: trimmed.map((criterion) => criterion.criterionId),
      createdBy: uid,
      createdAt: serverTimestamp(),
    });
    tx.set(configRef, {
      classId,
      activeVersionId: versionRef.id,
      versionNumber: nextVersionNumber,
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });
  });

  return savedVersionId;
}

export function subscribeToActivePeerReviewChecklist(
  classId: string,
  cb: (version: ChecklistVersion | null) => void,
  onError?: (err: Error) => void
) {
  const configRef = doc(db, `classes/${classId}/peerReviewChecklist`, 'active');
  return onSnapshot(configRef, async (configSnap) => {
    if (!configSnap.exists()) {
      cb(null);
      return;
    }
    const activeVersionId = configSnap.data().activeVersionId as string | undefined;
    if (!activeVersionId) {
      cb(null);
      return;
    }
    try {
      const versionSnap = await getDoc(
        doc(db, `classes/${classId}/checklistVersions`, activeVersionId)
      );
      if (!versionSnap.exists()) {
        cb(null);
        return;
      }
      const data = versionSnap.data();
      cb({
        id: versionSnap.id,
        classId: data.classId,
        versionNumber: data.versionNumber,
        criteria: Array.isArray(data.criteria) ? data.criteria : [],
        criterionIds: Array.isArray(data.criterionIds) ? data.criterionIds : [],
        createdBy: data.createdBy,
        createdAt: toMillis(data.createdAt),
      });
    } catch (err) {
      onError?.(err as Error);
    }
  }, (err) => onError?.(err));
}

export async function createOrGetPeerReviewDraft(params: {
  classId: string;
  reviewerGroupId: string;
  targetGroupId: string;
  uid: string;
}): Promise<PeerReviewDraft> {
  const { classId, reviewerGroupId, targetGroupId, uid } = params;
  if (reviewerGroupId === targetGroupId) {
    throw new Error('A group cannot review its own writing.');
  }

  const pairId = getPeerReviewPairId(reviewerGroupId, targetGroupId);
  const draftRef = doc(db, `classes/${classId}/peerReviewDrafts`, pairId);
  const configRef = doc(db, `classes/${classId}/peerReviewChecklist`, 'active');

  await runTransaction(db, async (tx) => {
    const [
      classSnap,
      reviewerSnap,
      targetSnap,
      studentSnap,
      configSnap,
      draftSnap,
      targetDocumentSnap,
    ] = await Promise.all([
      tx.get(doc(db, 'classes', classId)),
      tx.get(doc(db, `classes/${classId}/groups`, reviewerGroupId)),
      tx.get(doc(db, `classes/${classId}/groups`, targetGroupId)),
      tx.get(doc(db, `classes/${classId}/students`, uid)),
      tx.get(configRef),
      tx.get(draftRef),
      tx.get(doc(db, 'documents', targetGroupId)),
    ]);

    if (!classSnap.exists()) throw new Error('Classroom not found.');
    if (!reviewerSnap.exists() || !targetSnap.exists()) throw new Error('Writing group not found.');

    const reviewer = mapGroupDoc(reviewerSnap.id, reviewerSnap.data());
    const target = mapGroupDoc(targetSnap.id, targetSnap.data());
    const student = studentSnap.exists() ? studentSnap.data() : null;
    const memberIds = Array.isArray(reviewer.memberIds)
      ? reviewer.memberIds
      : reviewer.members.map((member) => member.uid);

    if (!student || student.groupId !== reviewerGroupId || !memberIds.includes(uid)) {
      throw new Error('You are not a current member of the reviewer group.');
    }
    if (!['SUBMITTED', 'REVIEWING', 'REVIEWED'].includes(reviewer.status)) {
      throw new Error('Submit your group writing to unlock peer review.');
    }
    if (!['SUBMITTED', 'REVIEWING', 'REVIEWED'].includes(target.status)) {
      throw new Error('The target group has not submitted writing.');
    }
    if (!configSnap.exists()) throw new Error('No checklist provided yet.');

    const activeVersionId = configSnap.data().activeVersionId as string | undefined;
    if (!activeVersionId) throw new Error('No checklist provided yet.');
    if (!draftSnap.exists()) {
      tx.set(draftRef, {
        id: pairId,
        classId,
        reviewerGroupId,
        targetGroupId,
        checklistVersionId: activeVersionId,
        overallFeedback: '',
        status: 'draft',
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedBy: uid,
        updatedAt: serverTimestamp(),
        submittedBy: null,
        submittedAt: null,
        revision: 1,
        reviewedDocumentRevision:
          targetDocumentSnap.exists() ? targetDocumentSnap.data().version ?? null : null,
      });
    }
  });

  const snap = await getDoc(draftRef);
  const data = snap.data();
  if (!snap.exists() || !data) throw new Error('Peer review draft could not be created.');
  return {
    id: snap.id,
    classId: data.classId,
    reviewerGroupId: data.reviewerGroupId,
    targetGroupId: data.targetGroupId,
    checklistVersionId: data.checklistVersionId,
    overallFeedback: data.overallFeedback ?? '',
    status: data.status,
    createdBy: data.createdBy,
    createdAt: toMillis(data.createdAt),
    updatedBy: data.updatedBy,
    updatedAt: toMillis(data.updatedAt),
    submittedBy: data.submittedBy ?? null,
    submittedAt: data.submittedAt ? toMillis(data.submittedAt) : null,
    revision: data.revision ?? 1,
    reviewedDocumentRevision: data.reviewedDocumentRevision ?? null,
  };
}

export function subscribeToPeerReviewDraft(
  classId: string,
  reviewerGroupId: string,
  targetGroupId: string,
  cb: (draft: PeerReviewDraft | null) => void,
  onError?: (err: Error) => void
) {
  const pairId = getPeerReviewPairId(reviewerGroupId, targetGroupId);
  return onSnapshot(doc(db, `classes/${classId}/peerReviewDrafts`, pairId), (snap) => {
    if (!snap.exists()) {
      cb(null);
      return;
    }
    const data = snap.data();
    cb({
      id: snap.id,
      classId: data.classId,
      reviewerGroupId: data.reviewerGroupId,
      targetGroupId: data.targetGroupId,
      checklistVersionId: data.checklistVersionId,
      overallFeedback: data.overallFeedback ?? '',
      status: data.status,
      createdBy: data.createdBy,
      createdAt: toMillis(data.createdAt),
      updatedBy: data.updatedBy,
      updatedAt: toMillis(data.updatedAt),
      submittedBy: data.submittedBy ?? null,
      submittedAt: data.submittedAt ? toMillis(data.submittedAt) : null,
      revision: data.revision ?? 1,
      reviewedDocumentRevision: data.reviewedDocumentRevision ?? null,
    });
  }, (err) => onError?.(err));
}

export async function setPeerReviewCriterion(
  classId: string,
  reviewerGroupId: string,
  targetGroupId: string,
  criterionId: string,
  checked: boolean,
  uid: string
): Promise<void> {
  if (typeof checked !== 'boolean') throw new Error('Checklist response must be Boolean.');
  const pairId = getPeerReviewPairId(reviewerGroupId, targetGroupId);
  await setDoc(
    doc(
      db,
      `classes/${classId}/peerReviewDrafts`,
      pairId,
      'responses',
      criterionId
    ),
    {
      criterionId,
      checked,
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    }
  );
}

export async function updatePeerReviewOverallFeedback(
  classId: string,
  reviewerGroupId: string,
  targetGroupId: string,
  uid: string,
  overallFeedback: string
): Promise<void> {
  const pairId = getPeerReviewPairId(reviewerGroupId, targetGroupId);
  const draftRef = doc(db, `classes/${classId}/peerReviewDrafts`, pairId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(draftRef);
    if (!snap.exists()) throw new Error('Peer review draft not found.');
    const data = snap.data();
    if (data.status === 'submitted') throw new Error('Use save changes for a submitted review.');
    tx.update(draftRef, {
      overallFeedback: overallFeedback.slice(0, 5000),
      updatedBy: uid,
      updatedAt: serverTimestamp(),
      revision: ((data.revision as number) || 1) + 1,
    });
  });
}

export function subscribeToPeerReviewPublished(
  classId: string,
  reviewerGroupId: string,
  targetGroupId: string,
  cb: (review: PeerReviewPublished | null) => void,
  onError?: (err: Error) => void
) {
  const pairId = getPeerReviewPairId(reviewerGroupId, targetGroupId);
  return onSnapshot(doc(db, `classes/${classId}/peerReviews`, pairId), (snap) => {
    if (!snap.exists()) {
      cb(null);
      return;
    }
    const data = snap.data();
    cb({
      id: snap.id,
      classId: data.classId,
      reviewerGroupId: data.reviewerGroupId,
      targetGroupId: data.targetGroupId,
      checklistVersionId: data.checklistVersionId,
      overallFeedback: data.overallFeedback ?? '',
      status: 'submitted',
      createdBy: data.createdBy,
      createdAt: toMillis(data.createdAt),
      updatedBy: data.updatedBy,
      updatedAt: toMillis(data.updatedAt),
      submittedBy: data.submittedBy,
      submittedAt: toMillis(data.submittedAt),
      revision: data.revision ?? 1,
      reviewedDocumentRevision: data.reviewedDocumentRevision ?? null,
    });
  }, (err) => onError?.(err));
}

export function subscribeToPublishedReviewsForTarget(
  classId: string,
  targetGroupId: string,
  cb: (reviews: PeerReviewPublished[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    collection(db, `classes/${classId}/peerReviews`),
    where('targetGroupId', '==', targetGroupId),
    where('status', '==', 'submitted')
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((reviewSnap) => {
      const data = reviewSnap.data();
      return {
        id: reviewSnap.id,
        classId: data.classId,
        reviewerGroupId: data.reviewerGroupId,
        targetGroupId: data.targetGroupId,
        checklistVersionId: data.checklistVersionId,
        overallFeedback: data.overallFeedback ?? '',
        status: 'submitted',
        createdBy: data.createdBy,
        createdAt: toMillis(data.createdAt),
        updatedBy: data.updatedBy,
        updatedAt: toMillis(data.updatedAt),
        submittedBy: data.submittedBy,
        submittedAt: toMillis(data.submittedAt),
        revision: data.revision ?? 1,
        reviewedDocumentRevision: data.reviewedDocumentRevision ?? null,
      };
    }));
  }, (err) => onError?.(err));
}

export function subscribeToPeerReviewResponses(
  classId: string,
  pairId: string,
  location: 'draft' | 'published',
  cb: (responses: ChecklistResponse[]) => void,
  onError?: (err: Error) => void
) {
  const collectionName =
    location === 'draft' ? 'peerReviewDrafts' : 'peerReviews';
  const q = query(
    collection(db, `classes/${classId}/${collectionName}`, pairId, 'responses')
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((responseSnap) => {
      const data = responseSnap.data();
      return {
        criterionId: data.criterionId,
        checked: data.checked === true,
        updatedBy: data.updatedBy,
        updatedAt: toMillis(data.updatedAt),
      };
    }));
  }, (err) => onError?.(err));
}

export async function submitPeerReview(params: {
  classId: string;
  reviewerGroupId: string;
  targetGroupId: string;
  uid: string;
}): Promise<void> {
  const { classId, reviewerGroupId, targetGroupId, uid } = params;
  const pairId = getPeerReviewPairId(reviewerGroupId, targetGroupId);
  const draftRef = doc(db, `classes/${classId}/peerReviewDrafts`, pairId);
  const publishedRef = doc(db, `classes/${classId}/peerReviews`, pairId);

  await runTransaction(db, async (tx) => {
    const [draftSnap, publishedSnap, reviewerSnap, targetSnap, studentSnap] =
      await Promise.all([
        tx.get(draftRef),
        tx.get(publishedRef),
        tx.get(doc(db, `classes/${classId}/groups`, reviewerGroupId)),
        tx.get(doc(db, `classes/${classId}/groups`, targetGroupId)),
        tx.get(doc(db, `classes/${classId}/students`, uid)),
      ]);

    if (!draftSnap.exists()) throw new Error('Peer review draft not found.');
    if (publishedSnap.exists()) throw new Error('This group review has already been submitted.');
    if (!reviewerSnap.exists() || !targetSnap.exists()) throw new Error('Writing group not found.');

    const reviewer = mapGroupDoc(reviewerSnap.id, reviewerSnap.data());
    const target = mapGroupDoc(targetSnap.id, targetSnap.data());
    const memberIds = Array.isArray(reviewer.memberIds)
      ? reviewer.memberIds
      : reviewer.members.map((member) => member.uid);
    const student = studentSnap.exists() ? studentSnap.data() : null;

    if (!student || student.groupId !== reviewerGroupId || !memberIds.includes(uid)) {
      throw new Error('You are not a current member of the reviewer group.');
    }
    if (!['SUBMITTED', 'REVIEWING', 'REVIEWED'].includes(reviewer.status)) {
      throw new Error('Submit your group writing to unlock peer review.');
    }
    if (!['SUBMITTED', 'REVIEWING', 'REVIEWED'].includes(target.status)) {
      throw new Error('The target group has not submitted writing.');
    }

    const draft = draftSnap.data();
    if (draft.status === 'submitted') {
      throw new Error('This group review has already been submitted.');
    }
    if (draft.reviewerGroupId !== reviewerGroupId || draft.targetGroupId !== targetGroupId) {
      throw new Error('Peer review identity does not match.');
    }

    const versionRef = doc(
      db,
      `classes/${classId}/checklistVersions`,
      draft.checklistVersionId
    );
    const versionSnap = await tx.get(versionRef);
    if (!versionSnap.exists()) throw new Error('Checklist version not found.');
    const criterionIds = Array.isArray(versionSnap.data().criterionIds)
      ? versionSnap.data().criterionIds as string[]
      : [];

    const responseSnaps = await Promise.all(
      criterionIds.map((criterionId) =>
        tx.get(doc(
          db,
          `classes/${classId}/peerReviewDrafts`,
          pairId,
          'responses',
          criterionId
        ))
      )
    );

    const submittedAt = serverTimestamp();
    const updatedAt = serverTimestamp();
    const revision = ((draft.revision as number) || 1) + 1;
    tx.set(publishedRef, {
      id: pairId,
      classId,
      reviewerGroupId,
      targetGroupId,
      checklistVersionId: draft.checklistVersionId,
      overallFeedback: draft.overallFeedback ?? '',
      status: 'submitted',
      createdBy: draft.createdBy,
      createdAt: draft.createdAt,
      updatedBy: uid,
      updatedAt,
      submittedBy: uid,
      submittedAt,
      revision,
      reviewedDocumentRevision: draft.reviewedDocumentRevision ?? null,
    });

    responseSnaps.forEach((responseSnap, index) => {
      const criterionId = criterionIds[index];
      const checked = responseSnap.exists()
        ? responseSnap.data().checked === true
        : false;
      tx.set(
        doc(db, `classes/${classId}/peerReviews`, pairId, 'responses', criterionId),
        {
          criterionId,
          checked,
          updatedBy: responseSnap.exists()
            ? responseSnap.data().updatedBy
            : uid,
          updatedAt: responseSnap.exists()
            ? responseSnap.data().updatedAt
            : updatedAt,
        }
      );
    });

  });
}

export async function savePublishedPeerReviewChanges(params: {
  classId: string;
  reviewerGroupId: string;
  targetGroupId: string;
  uid: string;
}): Promise<void> {
  const { classId, reviewerGroupId, targetGroupId, uid } = params;
  const pairId = getPeerReviewPairId(reviewerGroupId, targetGroupId);
  const draftRef = doc(db, `classes/${classId}/peerReviewDrafts`, pairId);
  const publishedRef = doc(db, `classes/${classId}/peerReviews`, pairId);

  await runTransaction(db, async (tx) => {
    const [draftSnap, publishedSnap, reviewerSnap, studentSnap] = await Promise.all([
      tx.get(draftRef),
      tx.get(publishedRef),
      tx.get(doc(db, `classes/${classId}/groups`, reviewerGroupId)),
      tx.get(doc(db, `classes/${classId}/students`, uid)),
    ]);

    if (!draftSnap.exists() || !publishedSnap.exists()) {
      throw new Error('Submitted peer review not found.');
    }
    if (!reviewerSnap.exists()) throw new Error('Reviewer group not found.');

    const reviewer = mapGroupDoc(reviewerSnap.id, reviewerSnap.data());
    const memberIds = Array.isArray(reviewer.memberIds)
      ? reviewer.memberIds
      : reviewer.members.map((member) => member.uid);
    const student = studentSnap.exists() ? studentSnap.data() : null;
    if (!student || student.groupId !== reviewerGroupId || !memberIds.includes(uid)) {
      throw new Error('You are not a current member of the reviewer group.');
    }
    if (!['SUBMITTED', 'REVIEWING', 'REVIEWED'].includes(reviewer.status)) {
      throw new Error('Submit your group writing to remain eligible.');
    }

    const draft = draftSnap.data();
    const published = publishedSnap.data();
    if (draft.checklistVersionId !== published.checklistVersionId) {
      throw new Error('The published checklist version cannot be changed.');
    }

    const versionSnap = await tx.get(
      doc(db, `classes/${classId}/checklistVersions`, draft.checklistVersionId)
    );
    if (!versionSnap.exists()) throw new Error('Checklist version not found.');
    const criterionIds = Array.isArray(versionSnap.data().criterionIds)
      ? versionSnap.data().criterionIds as string[]
      : [];
    const responseSnaps = await Promise.all(
      criterionIds.map((criterionId) =>
        tx.get(doc(
          db,
          `classes/${classId}/peerReviewDrafts`,
          pairId,
          'responses',
          criterionId
        ))
      )
    );

    const updatedAt = serverTimestamp();
    const revision = ((published.revision as number) || 1) + 1;
    tx.update(publishedRef, {
      overallFeedback: draft.overallFeedback ?? '',
      updatedBy: uid,
      updatedAt,
      revision,
    });

    responseSnaps.forEach((responseSnap, index) => {
      const criterionId = criterionIds[index];
      tx.set(
        doc(db, `classes/${classId}/peerReviews`, pairId, 'responses', criterionId),
        {
          criterionId,
          checked: responseSnap.exists()
            ? responseSnap.data().checked === true
            : false,
          updatedBy: uid,
          updatedAt,
        }
      );
    });

    tx.update(draftRef, {
      overallFeedback: draft.overallFeedback ?? '',
      updatedBy: uid,
      updatedAt,
      revision,
    });
  });
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
