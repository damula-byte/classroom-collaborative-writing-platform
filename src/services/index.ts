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
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Class, Group, Student, Document, Annotation } from '@/types';

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
    where('teacherId', '==', teacherId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Class)));
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

export function subscribeToGroups(classId: string, cb: (groups: Group[]) => void) {
  const q = query(collection(db, `classes/${classId}/groups`), orderBy('createdAt'));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Group)));
  });
}

// ---- Student Service ----
export async function registerStudent(data: {
  uid: string;
  classId: string;
  groupId: string;
  name: string;
}): Promise<void> {
  await addDoc(collection(db, `classes/${data.classId}/students`), {
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
    where('groupId', '==', groupId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Annotation)));
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
  await updateDocument(groupId, {
    status: to,
    locked: to === 'LOCKED',
    version: (await getDoc(doc(db, 'documents', groupId))).data()?.version + 1 || 1,
  });
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
