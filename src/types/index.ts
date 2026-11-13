export interface Class {
  id: string;
  code: string;
  title: string;
  topic: string;
  teacherId: string;
  teacherName: string;
  status: 'ACTIVE' | 'ARCHIVED';
  allowStudentGroupSelection: boolean;
  studentCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface Group {
  id: string;
  classId: string;
  name: string;
  members: Member[];
  status: 'WRITING' | 'SUBMITTED' | 'LOCKED' | 'REVIEWING' | 'REVIEWED';
  locked: boolean;
  createdAt: number;
}

export interface Member {
  uid: string;
  name: string;
  joinedAt: number;
}

export interface Student {
  uid: string;
  classId: string;
  groupId: string;
  name: string;
  joinedAt: number;
  lastSeenAt: number;
}

export interface Document {
  id: string;
  classId: string;
  groupId: string;
  textContent: string;
  htmlContent: string;
  contentSnapshot: string;
  wordCount: number;
  status: 'WRITING' | 'SUBMITTED' | 'LOCKED' | 'REVIEWING' | 'REVIEWED';
  locked: boolean;
  updatedBy: string;
  updatedAt: number;
  version: number;
}

export interface Annotation {
  id: string;
  documentId: string;
  groupId: string;
  authorId: string;
  authorName: string;
  type: 'highlight' | 'comment' | 'correction';
  from: number;
  to: number;
  selectedText: string;
  comment: string;
  color?: string;
  resolved: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PresenceEntry {
  name: string;
  online: boolean;
  lastSeen: number;
}

export type AnnotationColor = 'yellow' | 'green' | 'pink' | 'blue';

export const ANNOTATION_COLORS: Record<AnnotationColor, string> = {
  yellow: 'rgba(250, 204, 21, 0.4)',
  green: 'rgba(34, 197, 94, 0.4)',
  pink: 'rgba(236, 72, 153, 0.4)',
  blue: 'rgba(59, 130, 246, 0.4)',
};