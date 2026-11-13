import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, StatusBadge } from '@/components/common';
import { CollaborativeEditor } from '@/components/editor/CollaborativeEditor';
import { AnnotationHighlighter } from '@/components/editor/AnnotationHighlighter';
import { AnnotationSidebar } from '@/components/editor/AnnotationSidebar';
import { WordCounter } from '@/components/editor/WordCounter';
import { useDocument, useAnnotations } from '@/hooks/useDocument';
import { useYDoc, useCollaboration } from '@/hooks/useCollaboration';
import { usePresence } from '@/hooks/usePresence';
import { useAuth } from '@/hooks/useAuth';
import { updateDocument, submitDocument } from '@/services';
import { debounce } from '@/utils';

export function StudentWorkspace() {
  const { groupId: rawGroupId } = useParams<{ groupId: string }>();
  const groupId = rawGroupId || null;
  const { document, loading } = useDocument(groupId);
  const { annotations } = useAnnotations(groupId);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [wordCount, setWordCount] = useState(0);

  // Yjs document for CRDT sync
  const ydoc = useYDoc(groupId);

  // RTDB collaboration signaling
  const classId = document?.classId ?? null;
  const { synced } = useCollaboration(groupId, classId, ydoc);

  // Real-time presence tracking
  const userName = user?.isAnonymous ? 'Student' : (user?.displayName || 'User');
  usePresence(classId, groupId, user?.uid ?? null, userName);

  // Debounced snapshot persistence to Firestore
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
      console.error('Failed to save snapshot:', err);
    }
  }, 3000);

  // Update content and word count, trigger debounced save
  const handleContentChange = useCallback((text: string) => {
    setContent(text);
    const wc = text.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(wc);
    debouncedSave(text, wc);
  }, [debouncedSave]);

  // Sync document content when loaded
  useEffect(() => {
    if (document?.textContent) {
      setContent(document.textContent);
      setWordCount(document.wordCount || 0);
    }
  }, [document]);

  const handleSave = () => {
    if (!groupId) return;
    updateDocument(groupId, {
      textContent: content,
      wordCount,
      updatedAt: Date.now(),
      updatedBy: user?.uid || '',
    });
  };

  const handleSubmit = async () => {
    if (!groupId) return;
    try {
      await submitDocument(groupId);
    } catch (err: any) {
      console.error('Failed to submit:', err);
    }
  };

  // Random color for this student's cursor
  const userColor = '#6366f1';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-500">Loading workspace...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate(-1)}>
                ← Back
              </Button>
              <h1 className="text-xl font-bold text-slate-900">Student Workspace</h1>
              {synced && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Synced
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {document && <StatusBadge status={document.status} />}
              <Button variant="secondary" onClick={handleSave}>
                Save Draft
              </Button>
              <Button onClick={handleSubmit}>Submit</Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900">Collaborative Editor</h2>
                <WordCounter count={wordCount} />
              </div>
<CollaborativeEditor
                 ydoc={ydoc}
                 content={document?.textContent || ''}
                 onChange={handleContentChange}
                 editable={document?.status === 'WRITING'}
                 user={{ name: userName, color: userColor }}
               />

               {annotations.length > 0 && (
                 <div className="mt-4 border-t border-slate-100 pt-4">
                   <h4 className="text-sm font-medium text-slate-700 mb-2">Teacher annotations:</h4>
                   <AnnotationHighlighter
                     content={document?.textContent || ''}
                     annotations={annotations}
                   />
                 </div>
               )}
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Annotations</h3>
              <AnnotationSidebar annotations={annotations} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}