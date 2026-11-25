import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button, StatusBadge, Modal, Toast } from '@/components/common';
import { AppHeader, CommentsSidebar } from '@/components/ui';
import { CollaborativeEditor } from '@/components/editor/CollaborativeEditor';
import { AnnotationHighlighter } from '@/components/editor/AnnotationHighlighter';
import { WordCounter } from '@/components/editor/WordCounter';
import { useDocument, useAnnotations } from '@/hooks/useDocument';
import { useClass } from '@/hooks/useClass';
import { useGroups } from '@/hooks/useGroup';
import { useAuth } from '@/hooks/useAuth';
import {
  updateDocument,
  lockDocumentState,
  unlockDocumentState,
  startReview,
  completeReview,
  createAnnotation,
  resolveAnnotation,
  deleteAnnotation,
  subscribeToWritingComments,
  createWritingComment,
  returnToStudents,
  updateWritingComment,
  deleteWritingReply,
  softDeleteWritingComment,
  resolveWritingComment,
  reopenWritingComment,
} from '@/services';
import { WritingComment, HighlightColor } from '@/types';
import { BRANDING } from '@/config/branding';
import { debounce, sanitizeRichHtml } from '@/utils';
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  Unlock,
  Play,
  Check,
  MessageSquare,
  Highlighter,
  Trash2,
  Clock,
  Sparkles,
  Users,
  Edit3,
} from 'lucide-react';

export function ReviewMode() {
  const { classId, groupId: rawGroupId } = useParams<{ classId?: string; groupId: string }>();
  const groupId = rawGroupId || null;
  const navigate = useNavigate();

  const { document, loading } = useDocument(groupId);
  const { annotations, setAnnotations } = useAnnotations(groupId);
  const { user, teacherName, logout } = useAuth();

  // Load class and groups safely to provide rich header and breadcrumb context
  const { cls } = useClass(classId || document?.classId || null);
  const { groups } = useGroups(classId || document?.classId || null);
  const currentGroup = groups.find((g) => g.id === groupId);

  const [isEditing, setIsEditing] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [, setHtmlContent] = useState('');
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [commentText, setCommentText] = useState('');
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [wsComments, setWsComments] = useState<WritingComment[]>([]);
  const [wsSelectedQuote, setWsSelectedQuote] = useState<string | null>(null);
  const [wsHighlightColor, setWsHighlightColor] = useState<HighlightColor>('orange');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  useEffect(() => {
    if (!groupId) return;
    const unsub = subscribeToWritingComments(groupId, setWsComments);
    return () => unsub();
  }, [groupId]);

  const handleReturnToStudents = async () => {
    const resolvedClassId = classId || document?.classId;
    if (!resolvedClassId || !groupId) return;
    try {
      await returnToStudents(resolvedClassId, groupId);
      setToast({ message: 'Writing returned to students for revision.', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to return writing', type: 'error' });
    }
  };

  const handleAddWsComment = async (body: string, parentId?: string | null) => {
    const resolvedClassId = classId || document?.classId;
    if (!resolvedClassId || !groupId || !user?.uid) return;
    await createWritingComment({
      classId: resolvedClassId,
      groupId,
      authorId: user.uid,
      authorName: teacherName,
      authorRole: 'teacher',
      body,
      parentId: parentId ?? null,
      selectedText: parentId ? null : wsSelectedQuote,
      highlightColor: parentId ? null : wsSelectedQuote ? wsHighlightColor : null,
      documentRevision: document?.version ?? null,
    });
    if (!parentId) setWsSelectedQuote(null);
  };

  // Debounced save to Firestore (preserves existing 5000ms debounce)
  const debouncedSave = useMemo(
    () =>
      debounce(async (text: string, html: string, wc: number) => {
        if (!groupId) return;
        try {
          await updateDocument(groupId, {
            textContent: text,
            htmlContent: sanitizeRichHtml(html),
            wordCount: wc,
            updatedAt: Date.now(),
            updatedBy: user?.uid || '',
          });
        } catch (err) {
          console.error('Failed to save document:', err);
        }
      }, 5000),
    [groupId, user?.uid]
  );

  const handleContentChange = useCallback(
    (text: string) => {
      const wc = text.trim().split(/\s+/).filter(Boolean).length;
      setWordCount(wc);
    },
    [debouncedSave]
  );

  const handleHtmlChange = useCallback(
    (html: string) => {
      setHtmlContent(html);
      const element = window.document.createElement('div');
      element.innerHTML = html;
      const text = element.textContent || '';
      const wc = text.trim().split(/\s+/).filter(Boolean).length;
      setWordCount(wc);
      debouncedSave(text, html, wc);
    },
    [debouncedSave]
  );

  useEffect(() => {
    if (document?.textContent !== undefined) {
      setWordCount(document.wordCount || 0);
    }
  }, [document]);

  const handleToggleEdit = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      setToast({
        message: 'Direct editing enabled. Changes will sync to student copies.',
        type: 'info',
      });
    }
  };

  const handleLock = async () => {
    if (!groupId) return;
    try {
      if (document?.locked) {
        await unlockDocumentState(groupId);
      } else {
        await lockDocumentState(groupId);
      }
      setToast({
        message: document?.locked ? 'Document unlocked for students' : 'Document locked from editing',
        type: 'success',
      });
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to update lock state', type: 'error' });
    }
  };

  const handleStartReview = async () => {
    if (!groupId) return;
    try {
      await startReview(groupId);
      setToast({ message: 'Review session started', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to start review', type: 'error' });
    }
  };

  const handleCompleteReview = async () => {
    if (!groupId) return;
    try {
      await completeReview(groupId);
      setToast({ message: 'Review completed and saved', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to complete review', type: 'error' });
    }
  };

  const handleAddAnnotation = () => {
    if (!groupId || !user) return;
    setSelectedText('');
    setShowCommentModal(true);
  };

  const handleTextSelect = (text: string) => {
    setSelectedText(text);
    if (text.trim()) {
      setShowCommentModal(true);
    }
  };

  const handleSubmitAnnotation = async () => {
    if (!groupId || !user || !commentText.trim()) return;
    try {
      const annId = await createAnnotation({
        documentId: groupId,
        groupId,
        authorId: user.uid,
        authorName: teacherName || 'Teacher',
        type: 'comment',
        selectedText,
        comment: commentText.trim(),
        from: 0,
        to: 0,
      });

      setAnnotations([
        ...annotations,
        {
          id: annId,
          documentId: groupId,
          groupId,
          authorId: user.uid,
          authorName: teacherName || 'Teacher',
          type: 'comment',
          from: 0,
          to: 0,
          selectedText,
          comment: commentText.trim(),
          resolved: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);
      setCommentText('');
      setSelectedText('');
      setShowCommentModal(false);
      setToast({ message: 'Feedback added to thread', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to add annotation', type: 'error' });
    }
  };

  const handleResolveAnnotation = async (id: string) => {
    try {
      await resolveAnnotation(id);
      setAnnotations(annotations.map((a) => (a.id === id ? { ...a, resolved: true } : a)));
      setToast({ message: 'Feedback marked as resolved', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to resolve feedback', type: 'error' });
    }
  };

  const handleDeleteAnnotation = async (id: string) => {
    try {
      await deleteAnnotation(id);
      setAnnotations(annotations.filter((a) => a.id !== id));
      setToast({ message: 'Annotation removed', type: 'info' });
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to delete annotation', type: 'error' });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered annotations list
  const filteredAnnotations = annotations.filter((ann) => {
    if (filter === 'unresolved') return !ann.resolved;
    if (filter === 'resolved') return ann.resolved;
    return true;
  });

  const unresolvedCount = annotations.filter((a) => !a.resolved).length;

  const breadcrumbs = (
    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold">
      <Link to="/teacher/dashboard" className="text-slate-400 hover:text-slate-700 transition">
        Classes
      </Link>
      <span className="text-slate-300">/</span>
      {classId ? (
        <Link
          to={`/teacher/classes/${classId}`}
          className="text-slate-400 hover:text-slate-700 transition truncate max-w-[120px]"
        >
          {cls?.title || 'Class'}
        </Link>
      ) : (
        <span className="text-slate-400">Class</span>
      )}
      <span className="text-slate-300">/</span>
      <span className="text-slate-800 font-bold truncate max-w-[120px]">
        {currentGroup?.name || 'Group'}
      </span>
      <span className="text-slate-300">/</span>
      <span className="text-orange-600 font-bold">Review</span>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbfaf7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          <p className="text-sm font-bold text-slate-500">Loading student essay & review workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfaf7] font-sans flex flex-col justify-between">
      <div>
        {/* Sticky App Header */}
        <AppHeader
          productName={BRANDING.productName}
          userName={teacherName}
          roleLabel="Teacher"
          roleVariant="orange"
          breadcrumbs={breadcrumbs}
          onLogout={handleLogout}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          {/* Top navigation row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <Link
              to={classId ? `/teacher/classes/${classId}` : '/teacher/dashboard'}
              className="group inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-900 transition"
            >
              <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
              <span>Back to Classroom</span>
            </Link>

            <div className="flex flex-wrap items-center gap-2.5">
              {document && <StatusBadge status={document.status} />}
              <Button
                size="sm"
                variant={isEditing ? 'secondary' : 'ws-primary'}
                onClick={handleToggleEdit}
                className="text-xs font-bold py-2 px-3.5 flex items-center gap-1.5 shadow-2xs"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>{isEditing ? 'Finish Direct Edit' : 'Direct Edit Essay'}</span>
              </Button>
            </div>
          </div>

          {/* Workspace Title & Topic Banner */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600 mb-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Teacher Review Workspace</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  {currentGroup?.name || 'Student Writing'} · Feedback & Assessment
                </h1>
                {cls?.topic && (
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    <span className="font-semibold text-slate-700">Topic: </span>
                    {cls.topic}
                  </p>
                )}
              </div>

              {/* Members Pill */}
              {currentGroup && (
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 shrink-0 self-start md:self-auto">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span>{currentGroup.members.length} student{currentGroup.members.length === 1 ? '' : 's'} in group</span>
                </div>
              )}
            </div>
          </div>

          {/* Main 2-Column Workspace: Left Document (70%), Right Annotation Stream (30%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Student Document & Editor Panel (8 Cols = ~67%) */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
                {/* Editor Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-5">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold tracking-tight text-slate-900">
                      Collaborative Essay Content
                    </h2>
                    {isEditing && (
                      <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                        Editing Mode
                      </span>
                    )}
                  </div>
                  <WordCounter count={wordCount} />
                </div>

                {/* Collaborative Editor (ydoc preserved as null, existing implementation) */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-2">
                  <CollaborativeEditor
                    ydoc={null}
                    content={document?.htmlContent || document?.textContent || ''}
                    onChange={handleContentChange}
                    onHtmlChange={handleHtmlChange}
                    onSelectText={handleTextSelect}
                    editable={isEditing}
                    user={{ name: teacherName, color: '#f97316' }}
                  />
                </div>

                {/* Annotation Highlighting Overlay below editor */}
                {!isEditing && annotations.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                      <Highlighter className="h-3.5 w-3.5 text-orange-500" />
                      <span>Text Passage Highlights:</span>
                    </div>
                    <div className="rounded-2xl bg-[#faf9f6] p-4 border border-slate-200/60 leading-relaxed text-sm text-slate-800">
                      <AnnotationHighlighter
                        content={document?.textContent || ''}
                        annotations={annotations}
                        onAnnotationClick={(ann) => {
                          setToast({
                            message: `Note: "${ann.comment || ann.selectedText}"`,
                            type: 'info',
                          });
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Metadata details */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-4 border-t border-slate-100">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Last updated:{' '}
                    {document?.updatedAt
                      ? new Date(document.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Never'}
                  </span>
                  <span>Select any text passage in the editor to quickly attach feedback.</span>
                </div>
              </div>

              {/* Review Lifecycle Actions Bar */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleAddAnnotation}
                    className="text-xs font-bold py-2.5"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-orange-600" />
                    <span>Add Feedback</span>
                  </Button>

                  <Button
                    size="sm"
                    variant={document?.locked ? 'danger' : 'secondary'}
                    onClick={handleLock}
                    className="text-xs font-bold py-2.5"
                  >
                    {document?.locked ? (
                      <>
                        <Unlock className="h-3.5 w-3.5" />
                        <span>Unlock Document</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5" />
                        <span>Lock Document</span>
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex items-center gap-2.5">
                  {document?.status === 'SUBMITTED' && (
                    <Button
                      size="sm"
                      variant="ws-primary"
                      onClick={handleStartReview}
                      className="text-xs font-bold py-2.5"
                    >
                      <Play className="h-3.5 w-3.5 fill-white" />
                      <span>Start Formal Review</span>
                    </Button>
                  )}

                  {document?.status === 'REVIEWING' && (
                    <Button
                      size="sm"
                      variant="ws-green"
                      onClick={handleCompleteReview}
                      className="text-xs font-bold py-2.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Complete & Publish Review</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Teacher Feedback Stream (4 Cols = ~33%) */}
            <div className="lg:col-span-4 space-y-5">
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs">
                {/* Header & Filter Pills */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-orange-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      Feedback Stream ({annotations.length})
                    </h3>
                  </div>

                  {unresolvedCount > 0 && (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-800">
                      {unresolvedCount} open
                    </span>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="my-4 flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setFilter('all')}
                    className={`flex-1 py-1.5 rounded-xl transition ${
                      filter === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    All ({annotations.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('unresolved')}
                    className={`flex-1 py-1.5 rounded-xl transition ${
                      filter === 'unresolved'
                        ? 'bg-white text-orange-600 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Open ({unresolvedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('resolved')}
                    className={`flex-1 py-1.5 rounded-xl transition ${
                      filter === 'resolved'
                        ? 'bg-white text-green-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Resolved ({annotations.length - unresolvedCount})
                  </button>
                </div>

                {/* Annotation Cards List */}
                <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                  {filteredAnnotations.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
                      <MessageSquare className="mx-auto h-7 w-7 text-slate-300 mb-2" />
                      <p className="text-xs font-semibold text-slate-600">No feedback in this view.</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Select text in the student essay or click "Add Feedback" to guide your writers.
                      </p>
                    </div>
                  ) : (
                    filteredAnnotations.map((ann) => (
                      <div
                        key={ann.id}
                        className={`rounded-2xl border p-4 transition text-left ${
                          ann.resolved
                            ? 'bg-slate-50/70 border-slate-200 opacity-65'
                            : 'bg-orange-50/40 border-orange-200/80 shadow-2xs'
                        }`}
                      >
                        {/* Header: Author + Resolved button */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-200 text-orange-800 text-[10px] font-bold">
                              {ann.authorName?.charAt(0) || 'T'}
                            </div>
                            <span className="text-xs font-bold text-slate-800">
                              {ann.authorName || 'Teacher'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {!ann.resolved ? (
                              <button
                                type="button"
                                onClick={() => handleResolveAnnotation(ann.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-700 hover:bg-green-100 transition"
                                title="Mark as resolved"
                              >
                                <Check className="h-3 w-3" />
                                <span>Resolve</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Resolved</span>
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteAnnotation(ann.id)}
                              className="rounded-lg p-1 text-slate-300 hover:bg-red-50 hover:text-red-600 transition"
                              title="Delete note"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Selected passage quote if present */}
                        {ann.selectedText && (
                          <div className="mb-2 rounded-xl bg-white p-2.5 border border-orange-100 text-xs font-medium text-slate-700 italic border-l-4 border-l-orange-400">
                            "{ann.selectedText}"
                          </div>
                        )}

                        {/* Comment text */}
                        <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
                          {ann.comment}
                        </p>

                        {/* Timestamp */}
                        <div className="mt-2 text-[10px] text-slate-400">
                          {ann.createdAt ? new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Feedback button in sidebar */}
                <Button
                  size="sm"
                  variant="ws-primary"
                  onClick={handleAddAnnotation}
                  className="w-full mt-4 text-xs font-bold py-2.5 shadow-xs"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Attach New Feedback</span>
                </Button>

                {document && document.status !== 'WRITING' && (
                  <button
                    type="button"
                    onClick={handleReturnToStudents}
                    className="w-full mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 transition"
                  >
                    Return to students
                  </button>
                )}
              </div>

              {/* WriteSpace 360px Comments & Replies Sidebar */}
              <CommentsSidebar
                comments={wsComments}
                canComment={true}
                currentUserId={user?.uid}
                canResolve={true}
                selectedQuote={wsSelectedQuote}
                highlightColor={wsHighlightColor}
                onHighlightColorChange={setWsHighlightColor}
                onClearSelection={() => setWsSelectedQuote(null)}
                onAddComment={handleAddWsComment}
                onResolveThread={(commentId) => resolveWritingComment(commentId, user?.uid || '')}
                onReopenThread={(commentId) => reopenWritingComment(commentId)}
                onEditComment={(commentId, body) => updateWritingComment(commentId, body)}
                onDeleteReply={(commentId) => deleteWritingReply(commentId)}
                onSoftDeleteThread={(commentId) => softDeleteWritingComment(commentId, user?.uid || '')}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Add Annotation Modal (Rounded 3xl panel) */}
      <Modal
        open={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        title="Add Teacher Feedback"
        size="md"
      >
        <div className="space-y-4">
          {selectedText ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Selected Text Passage:
              </label>
              <div className="p-3.5 bg-orange-50 border border-orange-100 rounded-2xl text-xs font-medium text-slate-800 italic border-l-4 border-l-orange-500">
                "{selectedText}"
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              Note: General group feedback (not tied to a specific text snippet).
            </p>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Teacher Comment & Guidance:
            </label>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="e.g. Excellent introduction! Consider expanding your supporting evidence in paragraph 2..."
              rows={4}
              className="w-full p-3.5 border border-slate-300 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-400 resize-none transition"
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCommentModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="ws-primary"
              disabled={!commentText.trim()}
              onClick={handleSubmitAnnotation}
              className="flex-1"
            >
              Submit Feedback
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast notifications */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </div>
  );
}
