import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, StatusBadge, Modal, Toast } from '@/components/common';
import { Logo, Avatar, EmptyState } from '@/components/ui';
import { CollaborativeEditor } from '@/components/editor/CollaborativeEditor';
import { AnnotationHighlighter } from '@/components/editor/AnnotationHighlighter';
import { WordCounter } from '@/components/editor/WordCounter';
import { useDocument, useAnnotations } from '@/hooks/useDocument';
import { useClass } from '@/hooks/useClass';
import { useGroups } from '@/hooks/useGroup';
import { usePresence } from '@/hooks/usePresence';
import { useAuth } from '@/hooks/useAuth';
import { updateDocument, submitDocument } from '@/services';
import { PresenceEntry } from '@/types';
import { BRANDING } from '@/config/branding';
import { debounce } from '@/utils';
import {
  ArrowLeft,
  CheckCircle2,
  Send,
  Check,
  AlertCircle,
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Lock,
  Save,
} from 'lucide-react';

export function StudentWorkspace() {
  const { groupId: rawGroupId } = useParams<{ groupId: string }>();
  const groupId = rawGroupId || null;
  const navigate = useNavigate();

  const { document, loading } = useDocument(groupId);
  const { annotations } = useAnnotations(groupId);
  const { user } = useAuth();

  // Load class and groups safely to extract group name and writing topic
  const classId = document?.classId ?? null;
  const { cls } = useClass(classId);
  const { groups } = useGroups(classId);
  const currentGroup = groups.find((g) => g.id === groupId);

  const [content, setContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [isPromptExpanded, setIsPromptExpanded] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  // Student username & presence tracking in RTDB
  const userName = user?.displayName || (user?.isAnonymous ? 'Student' : 'User');
  const userColor = '#16a34a'; // Green accent for student presence
  const peers = usePresence(classId, groupId, user?.uid ?? null, userName);

  // Filter online group members
  const peerList = Object.entries(peers || {});
  const onlinePeers = peerList.filter(([, p]: [string, PresenceEntry]) => p?.online === true);
  const onlineCount = onlinePeers.length;
  const maxVisibleAvatars = 4;
  const visibleAvatars = onlinePeers.slice(0, maxVisibleAvatars);
  const remainingCount = onlineCount - maxVisibleAvatars;

  // Debounced auto-save to Firestore (5000ms delay as in original implementation)
  const debouncedSave = useMemo(
    () =>
      debounce(async (text: string, wc: number) => {
        if (!groupId) return;
        setSaveStatus('saving');
        try {
          await updateDocument(groupId, {
            textContent: text,
            wordCount: wc,
            updatedAt: Date.now(),
            updatedBy: user?.uid || '',
          });
          setSaveStatus('saved');
        } catch (err) {
          console.error('Failed to save snapshot:', err);
          setSaveStatus('error');
        }
      }, 5000),
    [groupId, user?.uid]
  );

  const handleContentChange = useCallback(
    (text: string) => {
      setContent(text);
      const wc = text.trim().split(/\s+/).filter(Boolean).length;
      setWordCount(wc);
      setSaveStatus('saving');
      debouncedSave(text, wc);
    },
    [debouncedSave]
  );

  // Sync document content on initial load
  useEffect(() => {
    if (document?.textContent && !content) {
      setContent(document.textContent);
      setWordCount(document.wordCount || 0);
    }
  }, [document, content]);

  // Manual save trigger (Save Draft)
  const handleManualSave = async () => {
    if (!groupId) return;
    setSaveStatus('saving');
    try {
      await updateDocument(groupId, {
        textContent: content,
        wordCount,
        updatedAt: Date.now(),
        updatedBy: user?.uid || '',
      });
      setSaveStatus('saved');
      setToast({ message: 'Draft saved to classroom cloud', type: 'success' });
    } catch (err: any) {
      setSaveStatus('error');
      setToast({ message: err.message || 'Failed to save draft', type: 'error' });
    }
  };

  // Submit flow
  const handleConfirmSubmit = async () => {
    if (!groupId) return;
    setSubmitLoading(true);
    try {
      // Save current content first if any changes exist
      await updateDocument(groupId, {
        textContent: content,
        wordCount,
        updatedAt: Date.now(),
        updatedBy: user?.uid || '',
      });
      await submitDocument(groupId);
      setShowSubmitModal(false);
      setToast({ message: 'Essay submitted successfully to your teacher!', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to submit essay', type: 'error' });
    } finally {
      setSubmitLoading(false);
    }
  };

  // Check editing permission based strictly on document lifecycle status
  const isEditable = document?.status === 'WRITING' && !document?.locked;
  const canSubmit = document?.status === 'WRITING';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbfaf7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
          <p className="text-sm font-bold text-slate-500">Connecting to student writing workspace...</p>
        </div>
      </div>
    );
  }

  if (!groupId) {
    return (
      <div className="min-h-screen bg-[#fbfaf7] p-8 flex items-center justify-center">
        <EmptyState
          title="Invalid Group Workspace"
          description="We couldn't locate this writing group. Please check your class code and join again."
          action={
            <Button variant="ws-green" onClick={() => navigate('/join')}>
              Return to Class Join
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfaf7] font-sans flex flex-col justify-between select-text">
      <div>
        {/* Focused Student Header */}
        <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-sm shadow-2xs">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            {/* Left Header: Logo + Group Info */}
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => navigate('/join')}
                className="group flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition"
                title="Leave workspace"
              >
                <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
              </button>

              <Logo productName={BRANDING.productName} size="sm" />

              <div className="h-4 w-px bg-slate-200 hidden sm:block" />

              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base text-slate-900 truncate max-w-[150px] sm:max-w-[220px]">
                  {currentGroup?.name || 'Writing Group'}
                </span>
                {document && <StatusBadge status={document.status} />}
              </div>
            </div>

            {/* Right Header: Presence, Word Count, Save Status, Submit Button */}
            <div className="flex items-center gap-2.5 sm:gap-4">
              {/* Online Presence Avatars */}
              {onlineCount > 0 && (
                <div className="hidden md:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 py-1 pl-1.5 pr-3 shadow-2xs">
                  <div className="flex items-center -space-x-1.5">
                    {visibleAvatars.map(([uid, p]: [string, PresenceEntry]) => (
                      <Avatar
                        key={uid}
                        name={p.name}
                        size="sm"
                        variant="green"
                        className="ring-2 ring-white"
                      />
                    ))}
                    {remainingCount > 0 && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[10px] font-bold text-slate-700">
                        +{remainingCount}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-600">
                    {onlineCount} writing
                  </span>
                </div>
              )}

              {/* Real-time Save Status Pill */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                {saveStatus === 'saving' && (
                  <>
                    <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
                    <span className="text-orange-600 font-bold">Saving...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span className="text-slate-500">Saved</span>
                  </>
                )}
                {saveStatus === 'error' && (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-red-600 font-bold">Save failed</span>
                  </>
                )}
              </div>

              {/* Save Draft Button (Manual) */}
              {isEditable && (
                <button
                  type="button"
                  onClick={handleManualSave}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                  title="Save current version"
                >
                  <Save className="h-3.5 w-3.5 text-slate-400" />
                  <span>Save Draft</span>
                </button>
              )}

              {/* Submit Essay Button */}
              {canSubmit ? (
                <Button
                  size="sm"
                  variant="ws-green"
                  onClick={() => setShowSubmitModal(true)}
                  className="text-xs font-extrabold py-2 px-3.5 sm:px-4 shadow-xs flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Submit Essay</span>
                </Button>
              ) : (
                <div className="flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  <Lock className="h-3 w-3" />
                  <span>Read Only</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Writing Workspace Container */}
        <main className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          {/* Writing Prompt Banner (Collapsible) */}
          {cls?.topic ? (
            <div className="rounded-3xl border border-orange-200/80 bg-gradient-to-r from-orange-50/80 via-amber-50/50 to-orange-50/80 p-5 sm:p-6 shadow-2xs transition">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-700">
                  <Sparkles className="h-4 w-4 text-orange-600" />
                  <span>Writing Assignment Topic</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                  className="flex items-center gap-1 text-xs font-bold text-orange-700 hover:text-orange-900 transition focus:outline-none"
                >
                  <span>{isPromptExpanded ? 'Hide Prompt' : 'View Prompt'}</span>
                  {isPromptExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>

              {isPromptExpanded && (
                <p className="mt-3 text-sm sm:text-base font-medium leading-relaxed text-slate-800">
                  {cls.topic}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 text-xs text-slate-400 italic">
              No specific class prompt assigned. Write and collaborate freely with your teammates.
            </div>
          )}

          {/* Locked / Submitted Notification Notice if read-only */}
          {!isEditable && document && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3 text-xs sm:text-sm text-amber-900">
              <Lock className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold">
                  {document.status === 'SUBMITTED' && 'This essay has been submitted for teacher review.'}
                  {document.status === 'REVIEWING' && 'Your teacher is currently reviewing and grading this essay.'}
                  {document.status === 'REVIEWED' && 'Review complete! See teacher annotations and corrections below.'}
                  {document.status === 'LOCKED' && 'This document is temporarily locked by your teacher.'}
                </p>
                <p className="text-amber-700/90 text-xs mt-0.5">
                  Editing is currently disabled. You can still read the document and review annotations.
                </p>
              </div>
            </div>
          )}

          {/* Primary Distraction-Free Writing Card */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 shadow-xs space-y-4">
            {/* Top Editor Bar: Title + Word Counter */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                Group Essay Draft
              </h2>
              <WordCounter count={wordCount} />
            </div>

            {/* Collaborative Editor (CRITICAL: ydoc={null} strictly preserved) */}
            <div className="min-h-[380px] sm:min-h-[460px] text-slate-800 leading-relaxed font-sans">
              <CollaborativeEditor
                ydoc={null}
                content={document?.textContent || ''}
                onChange={handleContentChange}
                editable={isEditable}
                user={{ name: userName, color: userColor }}
              />
            </div>

            {/* Teacher Annotations Highlighter (Displayed when feedback is available) */}
            {annotations.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600">
                  <MessageSquare className="h-4 w-4 text-orange-600" />
                  <span>Teacher Feedback & Annotations ({annotations.length})</span>
                </div>

                <div className="rounded-2xl bg-[#faf9f6] p-4 sm:p-5 border border-slate-200/80 leading-relaxed text-sm text-slate-800">
                  <AnnotationHighlighter
                    content={document?.textContent || ''}
                    annotations={annotations}
                    onAnnotationClick={(ann) => {
                      setToast({
                        message: `Teacher Note: "${ann.comment || ann.selectedText}"`,
                        type: 'info',
                      });
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Subtle Bottom Footer */}
      <footer className="w-full border-t border-slate-200/60 bg-white py-4 mt-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 text-xs text-slate-400">
          <span>Writing as <strong className="text-slate-700 font-semibold">{userName}</strong></span>
          <span>Automatic autosave every 5s · {BRANDING.productName}</span>
        </div>
      </footer>

      {/* Submit Confirmation Modal */}
      <Modal
        open={showSubmitModal}
        onClose={() => !submitLoading && setShowSubmitModal(false)}
        title="Submit Group Essay"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl bg-green-50 p-4 border border-green-100 text-green-950">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold">Are you ready to submit your work?</p>
              <p className="text-xs text-green-800/90 mt-1 leading-relaxed">
                Submitting will send your essay to your teacher for review and lock editing for all
                group members.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100 text-xs text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>Word Count:</span>
              <span className="font-bold text-slate-900">{wordCount} words</span>
            </div>
            <div className="flex justify-between">
              <span>Group:</span>
              <span className="font-bold text-slate-900">{currentGroup?.name || 'Writing Group'}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowSubmitModal(false)}
              disabled={submitLoading}
              className="flex-1"
            >
              Keep Editing
            </Button>
            <Button
              type="button"
              variant="ws-green"
              loading={submitLoading}
              onClick={handleConfirmSubmit}
              className="flex-1"
            >
              Confirm & Submit
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast Notifications */}
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
