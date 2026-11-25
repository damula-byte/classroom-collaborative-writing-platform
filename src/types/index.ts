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
  // WriteSpace extensions (additive optional fields)
  votesPerStudent?: number;
  timerDurationSeconds?: number;
  timerStartedAt?: number | null;
  timerEndsAt?: number | null;
  timerPausedAt?: number | null;
  timerRemainingSeconds?: number | null;
  timerFinalizedAt?: number | null;
  timerRunId?: string | null;
}

export interface Group {
  id: string;
  classId: string;
  name: string;
  prompt?: string;
  maxMembers?: number;
  members: Member[];
  status: 'WRITING' | 'SUBMITTED' | 'LOCKED' | 'REVIEWING' | 'REVIEWED';
  locked: boolean;
  submittedAt?: number | null;
  returnedAt?: number | null;
  createdAt: number;
  updatedAt?: number;
}

export interface Member {
  uid: string;
  name: string;
  normalizedName?: string;
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

// WriteSpace 6-color highlights, comments, and voting models
export type HighlightColor = 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink';

export const WRITESPACE_HIGHLIGHT_COLORS: Record<
  HighlightColor,
  { label: string; bg: string; swatch: string; quoteClass: string }
> = {
  orange: {
    label: 'Orange',
    bg: '#fed7aa',
    swatch: 'bg-orange-300',
    quoteClass: 'border-orange-400 bg-orange-50 text-orange-900',
  },
  yellow: {
    label: 'Yellow',
    bg: '#fef08a',
    swatch: 'bg-yellow-300',
    quoteClass: 'border-yellow-400 bg-yellow-50 text-yellow-900',
  },
  green: {
    label: 'Green',
    bg: '#bbf7d0',
    swatch: 'bg-green-300',
    quoteClass: 'border-green-500 bg-green-50 text-green-900',
  },
  blue: {
    label: 'Blue',
    bg: '#bfdbfe',
    swatch: 'bg-sky-300',
    quoteClass: 'border-sky-500 bg-sky-50 text-sky-900',
  },
  purple: {
    label: 'Purple',
    bg: '#ddd6fe',
    swatch: 'bg-purple-300',
    quoteClass: 'border-purple-500 bg-purple-50 text-purple-900',
  },
  pink: {
    label: 'Pink',
    bg: '#fbcfe8',
    swatch: 'bg-pink-300',
    quoteClass: 'border-pink-500 bg-pink-50 text-pink-900',
  },
};

export interface WritingComment {
  id: string;
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
  createdAt: number;
}

export interface Vote {
  id: string;
  classId: string;
  groupId: string;
  voterUid: string;
  voterName: string;
  createdAt: number;
}

export interface VoterQuota {
  uid: string;
  classId: string;
  count: number;
  updatedAt: number;
}