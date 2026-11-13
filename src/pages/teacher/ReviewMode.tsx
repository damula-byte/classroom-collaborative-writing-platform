import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, StatusBadge, Modal, Toast } from '@/components/common';
import { CollaborativeEditor } from '@/components/editor/CollaborativeEditor';
import { AnnotationHighlighter } from '@/components/editor/AnnotationHighlighter';
import { AnnotationSidebar } from '@/components/editor/AnnotationSidebar';
import { WordCounter } from '@/components/editor/WordCounter';
import { useDocument, useAnnotations } from '@/hooks/useDocument';
import { useYDoc, useCollaboration } from '@/hooks/useCollaboration';
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
} from '@/services';
import { debounce } from '@/utils';

export function ReviewMode() {
  const { groupId: rawGroupId } = useParams<{ groupId: string }>();
  const groupId = rawGroupId || null;
  const { document, loading } = useDocument(groupId);
  const { annotations, setAnnotations } = useAnnotations(groupId);
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [commentText, setCommentText] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  // Yjs document for CRDT sync
  const ydoc = useYDoc(groupId);

  // RTDB collaboration signaling
  const classId = document?.classId ?? null;
  const { synced } = useCollaboration(groupId, classId, ydoc);

  // Debounced save to Firestore
  const debouncedSave = debounce(async (text: string, wc: number) => {
    if (!groupId) return;
    try {
      await updateDocument(groupId, {
        textContent: text,
        wordCount: wc,
        updatedAt: Date.now(),
        updatedBy: user?.uid || '',
      });
    } catch (err) {
      console.error('Failed to save:', err);
    }
  }, 2000);

  const handleContentChange = useCallback((text: string) => {
    const wc = text.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(wc);
    debouncedSave(text, wc);
  }, [debouncedSave]);

  useEffect(() => {
    if (document?.textContent) {
      setWordCount(document.wordCount || 0);
    }
  }, [document]);

  const handleToggleEdit = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      setToast({ message: 'You are now editing. Changes will propagate to students in real time.', type: 'info' });
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
        message: document?.locked ? 'Document unlocked' : 'Document locked',
        type: 'success',
      });
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to lock document', type: 'error' });
    }
  };

  const handleStartReview = async () => {
    if (!groupId) return;
    try {
      await startReview(groupId);
      setToast({ message: 'Review started', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to start review', type: 'error' });
    }
  };

  const handleCompleteReview = async () => {
    if (!groupId) return;
    try {
      await completeReview(groupId);
      setToast({ message: 'Review completed', type: 'success' });
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
        authorName: user.displayName || 'Teacher',
        type: 'comment',
        selectedText,
        comment: commentText,
        from: 0,
        to: 0,
      });
      setAnnotations([...annotations, {
        id: annId,
        documentId: groupId,
        groupId,
        authorId: user.uid,
        authorName: user.displayName || 'Teacher',
        type: 'comment',
        from: 0,
        to: 0,
        selectedText,
        comment: commentText,
        resolved: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }]);
      setCommentText('');
      setShowCommentModal(false);
      setToast({ message: 'Annotation added', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to add annotation', type: 'error' });
    }
  };

  const handleResolveAnnotation = async (id: string) => {
    try {
      await resolveAnnotation(id);
      setAnnotations(annotations.map((a) => (a.id === id ? { ...a, resolved: true } : a)));
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to resolve', type: 'error' });
    }
  };

  const handleDeleteAnnotation = async (id: string) => {
    try {
      await deleteAnnotation(id);
      setAnnotations(annotations.filter((a) => a.id !== id));
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to delete', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-500">Loading review mode...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/teacher/dashboard" className="text-slate-600 hover:text-slate-900">
                ← Dashboard
              </Link>
              <h1 className="text-xl font-bold text-slate-900">Review Mode</h1>
              {synced && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Live
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {document && <StatusBadge status={document.status} />}
              <Button
                variant={isEditing ? 'secondary' : 'primary'}
                size="sm"
                onClick={handleToggleEdit}
              >
                {isEditing ? 'Exit Edit' : 'Edit Original'}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900">Student Essay</h2>
                <WordCounter count={wordCount} />
              </div>

<CollaborativeEditor
                ydoc={ydoc}
                content={document?.textContent || ''}
                onChange={handleContentChange}
                onSelectText={handleTextSelect}
                editable={isEditing}
                user={{ name: user?.displayName || 'Teacher', color: '#ef4444' }}
              />

               {!isEditing && annotations.length > 0 && (
                 <div className="mt-4 border-t border-slate-100 pt-4">
                   <h4 className="text-sm font-medium text-slate-700 mb-2">Annotations in text:</h4>
                   <AnnotationHighlighter
                     content={document?.textContent || ''}
                     annotations={annotations}
                     onAnnotationClick={(ann) => {
                       setToast({ message: `Annotation: ${ann.comment || ann.selectedText}`, type: 'info' });
                     }}
                   />
                 </div>
               )}

              <div className="mt-4 text-sm text-slate-500">
                Word count: {wordCount} • Last updated: {'lastUpdated' in (document || {}) ? new Date((document as any).updatedAt).toLocaleString() : 'Never'}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="secondary" onClick={handleAddAnnotation}>
                Add Highlight
              </Button>
              <Button variant="secondary" onClick={handleAddAnnotation}>
                Add Comment
              </Button>
              <Button variant="danger" onClick={handleLock}>
                {document?.locked ? 'Unlock Document' : 'Lock Document'}
              </Button>
              {document?.status === 'REVIEWING' && (
                <Button variant="primary" onClick={handleCompleteReview}>
                  Complete Review
                </Button>
              )}
              {document?.status === 'SUBMITTED' && (
                <Button variant="primary" onClick={handleStartReview}>
                  Start Review
                </Button>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Annotations</h3>
              <AnnotationSidebar
                annotations={annotations}
                onResolve={handleResolveAnnotation}
                onDelete={handleDeleteAnnotation}
              />
            </div>
          </div>
        </div>
      </main>

      <Modal
        open={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        title="Add Comment"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Selected Text
            </label>
            <p className="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-600">
              {selectedText}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Comment
            </label>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Enter your feedback..."
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
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
            <Button onClick={handleSubmitAnnotation} className="flex-1">
              Add Comment
            </Button>
          </div>
        </div>
      </Modal>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}