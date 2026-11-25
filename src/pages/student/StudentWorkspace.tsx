import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, StatusBadge, Modal, Toast } from '@/components/common';
import {
  Logo,
  Avatar,
  EmptyState,
  VoteButton,
  VoteCount,
  WinnerBadge,
  CommentsSidebar,
} from '@/components/ui';
import { CollaborativeEditor } from '@/components/editor/CollaborativeEditor';
import { AnnotationHighlighter } from '@/components/editor/AnnotationHighlighter';
import { WordCounter } from '@/components/editor/WordCounter';
import { useDocument, useAnnotations } from '@/hooks/useDocument';
import { useClass } from '@/hooks/useClass';
import { useGroups } from '@/hooks/useGroup';
import { usePresence } from '@/hooks/usePresence';
import { useAuth } from '@/hooks/useAuth';
import {
  updateDocument,
  submitDocument,
  subscribeToVotes,
  castVoteAtomic,
  subscribeToWritingComments,
  createWritingComment,
  getDocument,
  finalizeExpiredTimerIdempotent,
  updateWritingComment,
  deleteWritingReply,
  softDeleteWritingComment,
  subscribeToActivePeerReviewChecklist,
  createOrGetPeerReviewDraft,
  subscribeToPeerReviewDraft,
  subscribeToPeerReviewPublished,
  subscribeToPeerReviewResponses,
  setPeerReviewCriterion,
  updatePeerReviewOverallFeedback,
  submitPeerReview,
  savePublishedPeerReviewChanges,
  subscribeToPublishedReviewsForTarget,
} from '@/services';
import {
  PresenceEntry,
  Vote,
  WritingComment,
  HighlightColor,
  Document as WritingDoc,
  ChecklistVersion,
  PeerReviewDraft,
  PeerReviewPublished,
  ChecklistResponse,
} from '@/types';
import { BRANDING } from '@/config/branding';
import { debounce, calculateWinners, clampVotesPerStudent, sanitizeRichHtml } from '@/utils';
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
  Clock3,
  BookOpen,
  Users,
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
  const [htmlContent, setHtmlContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [isPromptExpanded, setIsPromptExpanded] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [votingGroupId, setVotingGroupId] = useState<string | null>(null);
  const [reviewGroupId, setReviewGroupId] = useState<string | null>(null);
  const [reviewDoc, setReviewDoc] = useState<WritingDoc | null>(null);
  const [reviewComments, setReviewComments] = useState<WritingComment[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);
  const [highlightColor, setHighlightColor] = useState<HighlightColor>('orange');
  const [activeChecklist, setActiveChecklist] = useState<ChecklistVersion | null>(null);
  const [peerDraft, setPeerDraft] = useState<PeerReviewDraft | null>(null);
  const [publishedReview, setPublishedReview] = useState<PeerReviewPublished | null>(null);
  const [peerResponses, setPeerResponses] = useState<ChecklistResponse[]>([]);
  const [receivedReviews, setReceivedReviews] = useState<PeerReviewPublished[]>([]);
  const [receivedResponseCounts, setReceivedResponseCounts] = useState<Record<string, { checked: number; total: number }>>({});
  const [peerReviewTab, setPeerReviewTab] = useState<'checklist' | 'comments'>('checklist');
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  // Student username & presence tracking in RTDB
  const userName = user?.displayName || localStorage.getItem('studentName') || (user?.isAnonymous ? 'Student' : 'User');
  const userColor = '#16a34a'; // Green accent for student presence
  const peers = usePresence(classId, groupId, user?.uid ?? null, userName);

  // Subscribe to class votes
  useEffect(() => {
    if (!classId) return;
    const unsub = subscribeToVotes(classId, setVotes);
    return () => unsub();
  }, [classId]);

  // Synchronized timer ticker
  useEffect(() => {
    if (!cls?.timerEndsAt || cls.timerPausedAt) return;
    const interval = window.setInterval(() => {
      const now = Date.now();
      setNowTick(now);
      if (classId && cls.timerEndsAt && now >= cls.timerEndsAt && (!cls.timerFinalizedAt || cls.timerFinalizedAt < cls.timerEndsAt)) {
        finalizeExpiredTimerIdempotent(classId).catch((err) => {
          console.error('Timer finalization error:', err);
        });
      }
    }, 500);
    return () => window.clearInterval(interval);
  }, [classId, cls?.timerEndsAt, cls?.timerPausedAt, cls?.timerFinalizedAt]);

  // Load peer review document & comments when reviewing another group
  useEffect(() => {
    if (!reviewGroupId) {
      setReviewDoc(null);
      setReviewComments([]);
      return;
    }
    getDocument(reviewGroupId).then(setReviewDoc).catch(console.error);
    const unsub = subscribeToWritingComments(reviewGroupId, setReviewComments);
    return () => unsub();
  }, [reviewGroupId]);

  useEffect(() => {
    if (!classId || !groupId || !reviewGroupId || !user?.uid) {
      setActiveChecklist(null);
      setPeerDraft(null);
      setPublishedReview(null);
      setPeerResponses([]);
      return;
    }

    const pairId = `${groupId}__${reviewGroupId}`;
    const unsubChecklist = subscribeToActivePeerReviewChecklist(classId, setActiveChecklist);
    createOrGetPeerReviewDraft({
      classId,
      reviewerGroupId: groupId,
      targetGroupId: reviewGroupId,
      uid: user.uid,
    }).catch(() => {
      setPeerDraft(null);
    });
    const unsubDraft = subscribeToPeerReviewDraft(
      classId,
      groupId,
      reviewGroupId,
      setPeerDraft
    );
    const unsubPublished = subscribeToPeerReviewPublished(
      classId,
      groupId,
      reviewGroupId,
      setPublishedReview
    );
    const unsubResponses = subscribeToPeerReviewResponses(
      classId,
      pairId,
      'draft',
      setPeerResponses
    );

    return () => {
      unsubChecklist();
      unsubDraft();
      unsubPublished();
      unsubResponses();
    };
  }, [classId, groupId, reviewGroupId, user?.uid]);

  useEffect(() => {
    if (!classId || !groupId) {
      setReceivedReviews([]);
      return;
    }
    return subscribeToPublishedReviewsForTarget(classId, groupId, setReceivedReviews);
  }, [classId, groupId]);

  useEffect(() => {
    if (!classId || receivedReviews.length === 0) {
      setReceivedResponseCounts({});
      return;
    }
    const unsubscribers = receivedReviews.map((review) =>
      subscribeToPeerReviewResponses(
        classId,
        review.id,
        'published',
        (responses) =>
          setReceivedResponseCounts((counts) => ({
            ...counts,
            [review.id]: {
              checked: responses.filter((response) => response.checked).length,
              total: responses.length,
            },
          }))
      )
    );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [classId, receivedReviews]);

  // Filter online group members
  const peerList = Object.entries(peers || {});
  const onlinePeers = peerList.filter(([, p]: [string, PresenceEntry]) => p?.online === true);
  const onlineCount = onlinePeers.length;
  const maxVisibleAvatars = 4;
  const visibleAvatars = onlinePeers.slice(0, maxVisibleAvatars);
  const remainingCount = onlineCount - maxVisibleAvatars;

  const timerInfo = useMemo(() => {
    if (!cls?.timerStartedAt && !cls?.timerEndsAt) return null;
    if (cls.timerPausedAt) {
      return { status: 'paused' as const, remaining: Math.max(0, cls.timerRemainingSeconds ?? 0) };
    }
    if (cls.timerEndsAt) {
      const rem = Math.max(0, Math.ceil((cls.timerEndsAt - nowTick) / 1000));
      return { status: rem <= 0 ? ('expired' as const) : ('running' as const), remaining: rem };
    }
    return null;
  }, [cls, nowTick]);

  const isTimerExpired = timerInfo?.status === 'expired';

  // Peer review & voting derived state
  const hasSubmittedOwnGroup = useMemo(() => {
    if (!user?.uid) return false;
    return groups.some(
      (g) =>
        (g.status === 'SUBMITTED' || g.status === 'REVIEWING' || g.status === 'REVIEWED') &&
        g.members.some((m) => m.uid === user.uid)
    );
  }, [groups, user?.uid]);

  const submittedGroups = useMemo(
    () =>
      groups.filter(
        (g) => g.status === 'SUBMITTED' || g.status === 'REVIEWING' || g.status === 'REVIEWED'
      ),
    [groups]
  );

  const votesByGroup = useMemo(() => {
    const map: Record<string, { count: number; names: string[]; hasVoted: boolean }> = {};
    for (const v of votes) {
      if (!map[v.groupId]) map[v.groupId] = { count: 0, names: [], hasVoted: false };
      map[v.groupId].count += 1;
      map[v.groupId].names.push(v.voterName);
      if (user?.uid && v.voterUid === user.uid) {
        map[v.groupId].hasVoted = true;
      }
    }
    return map;
  }, [votes, user?.uid]);

  const { winnerIds } = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const [gid, info] of Object.entries(votesByGroup)) counts[gid] = info.count;
    return calculateWinners(groups, counts);
  }, [groups, votesByGroup]);

  const votesUsed = useMemo(() => {
    if (!user?.uid) return 0;
    return votes.filter((v) => v.voterUid === user.uid).length;
  }, [votes, user?.uid]);

  const maxVotesAllowed = clampVotesPerStudent(cls?.votesPerStudent ?? 1);
  const remainingVotes = Math.max(0, maxVotesAllowed - votesUsed);

  // Debounced auto-save to Firestore (~450ms WriteSpace target)
  const debouncedSave = useMemo(
    () =>
      debounce(async (text: string, html: string, wc: number) => {
        if (!groupId || isTimerExpired) return;
        setSaveStatus('saving');
        try {
          await updateDocument(groupId, {
            textContent: sanitizeRichHtml(text),
            htmlContent: sanitizeRichHtml(html),
            wordCount: wc,
            updatedAt: Date.now(),
            updatedBy: user?.uid || '',
          });
          setSaveStatus('saved');
        } catch (err) {
          console.error('Failed to save snapshot:', err);
          setSaveStatus('error');
        }
      }, 450),
    [groupId, user?.uid, isTimerExpired]
  );

  const handleContentChange = useCallback(
    (text: string) => {
      setContent(text);
      const wc = text.trim().split(/\s+/).filter(Boolean).length;
      setWordCount(wc);
      setSaveStatus('saving');
    },
    [debouncedSave]
  );

  const handleHtmlChange = useCallback(
    (html: string) => {
      setHtmlContent(html);
      const element = window.document.createElement('div');
      element.innerHTML = html;
      const text = element.textContent || '';
      setContent(text);
      const wc = text.trim().split(/\s+/).filter(Boolean).length;
      setWordCount(wc);
      debouncedSave(text, html, wc);
    },
    [debouncedSave]
  );

  // Sync document content on initial load
  useEffect(() => {
    if (document?.textContent && !content) {
      setContent(document.textContent);
      setHtmlContent(document.htmlContent || document.textContent);
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
        htmlContent: sanitizeRichHtml(htmlContent),
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

  // Check editing permission based strictly on document lifecycle status & timer
  const isEditable = document?.status === 'WRITING' && !document?.locked && !isTimerExpired;
  const canSubmit = document?.status === 'WRITING' && !isTimerExpired;

  const handleVote = async (targetGroupId: string) => {
    if (!classId || !user?.uid) return;
    setVotingGroupId(targetGroupId);
    try {
      await castVoteAtomic({
        classId,
        groupId: targetGroupId,
        voterUid: user.uid,
        voterName: userName,
      });
      setToast({ message: 'Vote recorded!', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Could not cast vote', type: 'error' });
    } finally {
      setVotingGroupId(null);
    }
  };

  const handleReviewTextSelection = () => {
    const sel = window.getSelection()?.toString().trim() || '';
    if (!sel) return;
    if (sel.length > 500) {
      setToast({ message: 'Please select 500 characters or fewer to highlight.', type: 'warning' });
      return;
    }
    setSelectedQuote(sel);
  };

  const handleAddReviewComment = async (body: string, parentId?: string | null) => {
    if (!classId || !reviewGroupId || !user?.uid) return;
    await createWritingComment({
      classId,
      groupId: reviewGroupId,
      authorId: user.uid,
      authorName: userName,
      authorRole: 'student',
      body,
      parentId: parentId ?? null,
      selectedText: parentId ? null : selectedQuote,
      highlightColor: parentId ? null : selectedQuote ? highlightColor : null,
      documentRevision: reviewDoc?.version ?? null,
    });
    if (!parentId) setSelectedQuote(null);
  };

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

            {/* Right Header: Timer, Presence, Save Status, Submit Button */}
            <div className="flex items-center gap-2.5 sm:gap-4">
              {timerInfo && (
                <div
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-mono font-extrabold ${
                    timerInfo.status === 'expired'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : timerInfo.remaining <= 60 && timerInfo.status === 'running'
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : timerInfo.status === 'paused'
                      ? 'border-sky-200 bg-sky-50 text-sky-700'
                      : 'border-slate-200 bg-slate-50 text-slate-800'
                  }`}
                >
                  <Clock3 size={13} />
                  <span>
                    {String(Math.floor(timerInfo.remaining / 60)).padStart(2, '0')}:
                    {String(timerInfo.remaining % 60).padStart(2, '0')}
                  </span>
                </div>
              )}

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

          {/* Primary Distraction-Free Writing Card (#f1f3f4 workspace + 850px white paper) */}
          <div className="rounded-3xl bg-[#f1f3f4] p-4 sm:p-8 border border-slate-200/80">
            <div className="mx-auto max-w-[850px] rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 shadow-xs space-y-4">
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
                  content={document?.htmlContent || document?.textContent || ''}
                  onChange={handleContentChange}
                  onHtmlChange={handleHtmlChange}
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
          </div>

          {/* Peer Review & Voting Section */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <BookOpen size={18} className="text-green-600" />
                  <span>Submitted Writing & Peer Review</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Read classmates' submitted essays, leave feedback, and cast your votes.
                </p>
              </div>
              {hasSubmittedOwnGroup && (
                <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-extrabold text-rose-700">
                  {remainingVotes} / {maxVotesAllowed} votes left
                </span>
              )}
            </div>

            {receivedReviews.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Received reviews</p>
                {receivedReviews.map((review) => {
                  const reviewer = groups.find((group) => group.id === review.reviewerGroupId);
                  const count = receivedResponseCounts[review.id];
                  return (
                    <div key={review.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-extrabold text-slate-900">{reviewer?.name || 'Reviewer group'}</p>
                      {count && (
                        <p className="mt-1 text-xs font-bold text-slate-700">
                          {count.checked}/{count.total} criteria met
                        </p>
                      )}
                      {review.overallFeedback && (
                        <p className="mt-1 text-xs text-slate-600">{review.overallFeedback}</p>
                      )}
                      <p className="mt-1 text-[11px] text-slate-400">
                        Submitted {review.submittedAt ? new Date(review.submittedAt).toLocaleString() : ''}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {!hasSubmittedOwnGroup ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center space-y-2">
                <Lock className="mx-auto h-6 w-6 text-slate-400" />
                <p className="text-sm font-bold text-slate-700">Peer Review Locked</p>
                <p className="text-xs text-slate-500">
                  Submit your group's writing to unlock peer review.
                </p>
              </div>
            ) : submittedGroups.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No submitted essays in this classroom yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {submittedGroups.map((g) => {
                  const isOwn = g.members.some((m) => m.uid === user?.uid);
                  const voteInfo = votesByGroup[g.id] ?? { count: 0, names: [], hasVoted: false };
                  const isWinner = winnerIds.has(g.id);

                  return (
                    <div
                      key={g.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-extrabold text-slate-900">{g.name}</h3>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Users size={12} /> {g.members.map((m) => m.name).join(', ') || 'No members'}
                            </p>
                          </div>
                          {isWinner && <WinnerBadge />}
                        </div>
                        <VoteCount count={voteInfo.count} voterNames={voteInfo.names} />
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                        <button
                          type="button"
                          onClick={() => setReviewGroupId(g.id)}
                          className="ws-btn-secondary py-1.5 px-3 text-xs"
                        >
                          <MessageSquare size={13} /> Read & Comment
                        </button>
                        <VoteButton
                          isOwnGroup={isOwn}
                          hasVoted={voteInfo.hasVoted}
                          remainingVotes={remainingVotes}
                          isEligible={hasSubmittedOwnGroup}
                          loading={votingGroupId === g.id}
                          onVote={() => handleVote(g.id)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Subtle Bottom Footer */}
      <footer className="w-full border-t border-slate-200/60 bg-white py-4 mt-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 text-xs text-slate-400">
          <span>Writing as <strong className="text-slate-700 font-semibold">{userName}</strong></span>
          <span>Automatic autosave (~450ms) · {BRANDING.productName}</span>
        </div>
      </footer>

      {/* Peer Review Modal (Read-only essay + 360px CommentsSidebar) */}
      <Modal
        open={!!reviewGroupId}
        onClose={() => {
          setReviewGroupId(null);
          setSelectedQuote(null);
        }}
        title={groups.find((g) => g.id === reviewGroupId)?.name || 'Peer Review'}
        size="lg"
      >
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div
            onMouseUp={handleReviewTextSelection}
            className="flex-1 w-full rounded-2xl border border-slate-200 bg-white p-6 min-h-[300px] max-h-[70vh] overflow-y-auto text-sm text-slate-800 leading-relaxed whitespace-pre-wrap select-text"
          >
            {reviewDoc?.textContent ? (
              reviewDoc.textContent
            ) : (
              <span className="text-slate-400 italic">This group has not written any content yet.</span>
            )}
          </div>
          <aside className="w-full lg:w-[360px] shrink-0">
            <div className="flex gap-2 rounded-2xl bg-slate-100 p-1 mb-3">
              {(['checklist', 'comments'] as const).map((tab) => (
                <button
                  type="button"
                  key={tab}
                  onClick={() => setPeerReviewTab(tab)}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold capitalize ${
                    peerReviewTab === tab ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {peerReviewTab === 'checklist' ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-4 space-y-4">
                <div>
                  <p className="text-base font-extrabold text-slate-900">Peer Review Checklist</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Reviewing: {groups.find((g) => g.id === reviewGroupId)?.name || 'Target group'}
                  </p>
                  {currentGroup && (
                    <p className="text-xs text-slate-500">Reviewed by: {currentGroup.name}</p>
                  )}
                </div>

                {!activeChecklist ? (
                  <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                    No checklist provided yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {activeChecklist.criteria.map((criterion) => {
                      const response = peerResponses.find((item) => item.criterionId === criterion.criterionId);
                      return (
                        <label key={criterion.criterionId} className="flex items-start gap-2 rounded-xl border border-slate-100 p-2.5 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={response?.checked ?? false}
                            disabled={!peerDraft}
                            onChange={(event) => {
                              if (!classId || !groupId || !reviewGroupId || !user?.uid) return;
                              setPeerReviewCriterion(
                                classId,
                                groupId,
                                reviewGroupId,
                                criterion.criterionId,
                                event.target.checked,
                                user.uid
                              ).catch((error: Error) => setToast({ message: error.message, type: 'error' }));
                            }}
                          />
                          <span>{criterion.text}</span>
                        </label>
                      );
                    })}
                    <p className="text-xs font-bold text-slate-600">
                      {peerResponses.filter((response) => response.checked).length}/{activeChecklist.criteria.length} criteria met
                    </p>
                    <label className="block text-xs font-bold text-slate-600">
                      Overall feedback
                      <textarea
                        rows={4}
                        value={peerDraft?.overallFeedback ?? ''}
                        onChange={(event) => {
                          if (!classId || !groupId || !reviewGroupId || !user?.uid) return;
                          updatePeerReviewOverallFeedback(
                            classId,
                            groupId,
                            reviewGroupId,
                            user.uid,
                            event.target.value
                          ).catch((error: Error) => setToast({ message: error.message, type: 'error' }));
                        }}
                        className="ws-field mt-1.5 resize-none"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={!peerDraft}
                      onClick={async () => {
                        if (!classId || !groupId || !reviewGroupId || !user?.uid) return;
                        try {
                          if (publishedReview) {
                            await savePublishedPeerReviewChanges({
                              classId,
                              reviewerGroupId: groupId,
                              targetGroupId: reviewGroupId,
                              uid: user.uid,
                            });
                            setToast({ message: 'Review changes saved', type: 'success' });
                          } else {
                            await submitPeerReview({
                              classId,
                              reviewerGroupId: groupId,
                              targetGroupId: reviewGroupId,
                              uid: user.uid,
                            });
                            setToast({ message: 'Review submitted', type: 'success' });
                          }
                        } catch (error: unknown) {
                          setToast({
                            message: error instanceof Error ? error.message : 'Could not submit review',
                            type: 'error',
                          });
                        }
                      }}
                      className="ws-btn-primary w-full py-2.5 text-xs"
                    >
                      {publishedReview ? 'Save changes' : 'Submit review'}
                    </button>
                    {publishedReview && (
                      <p className="text-xs font-bold text-green-700">Review submitted</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <CommentsSidebar
                comments={reviewComments}
                canComment={hasSubmittedOwnGroup}
                currentUserId={user?.uid}
                selectedQuote={selectedQuote}
                highlightColor={highlightColor}
                onHighlightColorChange={setHighlightColor}
                onClearSelection={() => setSelectedQuote(null)}
                onAddComment={handleAddReviewComment}
                onEditComment={(commentId, body) => updateWritingComment(commentId, body)}
                onDeleteReply={(commentId) => deleteWritingReply(commentId)}
                onSoftDeleteThread={(commentId) => softDeleteWritingComment(commentId, user?.uid || '')}
              />
            )}
          </aside>
        </div>
      </Modal>

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
