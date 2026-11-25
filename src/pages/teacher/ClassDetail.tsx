import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button, StatusBadge, Modal, Input, Toast } from '@/components/common';
import { AppHeader, EmptyState, VoteCount, WinnerBadge } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useClass } from '@/hooks/useClass';
import { useGroups } from '@/hooks/useGroup';
import {
  createWriteSpaceGroup,
  getStudentCount,
  updateClass,
  updateGroupCapacity,
  removeGroupMember,
  returnToStudents,
  deleteGroupSafely,
  subscribeToVotes,
  startClassTimer,
  pauseClassTimer,
  resumeClassTimer,
  resetClassTimer,
  finalizeExpiredTimerIdempotent,
} from '@/services';
import { Vote } from '@/types';
import { BRANDING } from '@/config/branding';
import { calculateWinners, clampVotesPerStudent, clampMaxMembers } from '@/utils';
import {
  Users,
  Plus,
  Minus,
  Copy,
  Check,
  Eye,
  FileEdit,
  ArrowLeft,
  Sparkles,
  BookOpen,
  Trash2,
  UserMinus,
  Undo2,
  Play,
  Pause,
  RotateCcw,
  Clock3,
  Heart,
} from 'lucide-react';

interface GroupFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; prompt: string; maxMembers: number }) => Promise<void>;
}

function GroupForm({ open, onClose, onSubmit }: GroupFormProps) {
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [maxMembers, setMaxMembers] = useState(4);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        prompt: prompt.trim(),
        maxMembers: clampMaxMembers(maxMembers),
      });
      setName('');
      setPrompt('');
      setMaxMembers(4);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Writing Group" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Group Name"
          placeholder="e.g. Group Alpha / Team 1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={loading}
        />
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Writing Prompt (Optional)
          </label>
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Specific prompt or instructions for this group..."
            className="ws-field resize-none text-sm"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Maximum Members (1–20)
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMaxMembers((v) => clampMaxMembers(v - 1))}
              disabled={loading || maxMembers <= 1}
              className="ws-btn-secondary px-3 py-2"
              aria-label="Decrease max members"
            >
              <Minus size={14} />
            </button>
            <span className="w-10 text-center text-base font-extrabold text-slate-900">
              {maxMembers}
            </span>
            <button
              type="button"
              onClick={() => setMaxMembers((v) => clampMaxMembers(v + 1))}
              disabled={loading || maxMembers >= 20}
              className="ws-btn-secondary px-3 py-2"
              aria-label="Increase max members"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="ws-primary"
            loading={loading}
            className="flex-1"
          >
            Create Group
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function ClassDetail() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { teacherName, logout } = useAuth();
  const { cls, loading: classLoading } = useClass(classId || null);
  const { groups, loading: groupsLoading } = useGroups(classId || null);

  const [studentCount, setStudentCount] = useState<number>(0);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<{ id: string; name: string } | null>(null);
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<{
    groupId: string;
    uid: string;
    name: string;
  } | null>(null);
  const [timerMinutesInput, setTimerMinutesInput] = useState(15);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [copiedCode, setCopiedCode] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Fetch actual student count & subscribe to votes
  useEffect(() => {
    if (!classId) return;
    getStudentCount(classId).then((count) => {
      setStudentCount(count);
    });
    const unsubVotes = subscribeToVotes(classId, setVotes);
    return () => unsubVotes();
  }, [classId]);

  // Synchronized timer ticker + idempotent expiration reconciliation
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

  const votesByGroup = useMemo(() => {
    const map: Record<string, { count: number; names: string[] }> = {};
    for (const v of votes) {
      if (!map[v.groupId]) map[v.groupId] = { count: 0, names: [] };
      map[v.groupId].count += 1;
      map[v.groupId].names.push(v.voterName);
    }
    return map;
  }, [votes]);

  const { winnerIds } = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const [gid, info] of Object.entries(votesByGroup)) {
      counts[gid] = info.count;
    }
    return calculateWinners(groups, counts);
  }, [groups, votesByGroup]);

  const timerState = useMemo(() => {
    const configured = cls?.timerDurationSeconds ?? timerMinutesInput * 60;
    if (!cls?.timerStartedAt && !cls?.timerEndsAt) {
      return { status: 'idle' as const, remaining: configured };
    }
    if (cls?.timerPausedAt) {
      return {
        status: 'paused' as const,
        remaining: Math.max(0, cls.timerRemainingSeconds ?? configured),
      };
    }
    if (cls?.timerEndsAt) {
      const rem = Math.max(0, Math.ceil((cls.timerEndsAt - nowTick) / 1000));
      return { status: rem <= 0 ? ('expired' as const) : ('running' as const), remaining: rem };
    }
    return { status: 'idle' as const, remaining: configured };
  }, [cls, nowTick, timerMinutesInput]);

  const formattedTimer = useMemo(() => {
    const m = Math.floor(timerState.remaining / 60);
    const s = timerState.remaining % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [timerState.remaining]);

  const handleCopyCode = () => {
    if (!cls?.code) return;
    navigator.clipboard.writeText(cls.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAddGroup = async (data: { name: string; prompt: string; maxMembers: number }) => {
    if (!classId) return;
    try {
      await createWriteSpaceGroup(classId, data);
      setToast({ message: `Group "${data.name}" created successfully!`, type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to create group', type: 'error' });
    }
  };

  const handleVotesPerStudentChange = async (next: number) => {
    if (!classId) return;
    const clamped = clampVotesPerStudent(next);
    try {
      await updateClass(classId, { votesPerStudent: clamped });
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to update vote limit', type: 'error' });
    }
  };

  const handleCapacityChange = async (groupId: string, next: number) => {
    if (!classId) return;
    try {
      await updateGroupCapacity(classId, groupId, next);
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to update capacity', type: 'error' });
    }
  };

  const handleReturnGroup = async (groupId: string) => {
    if (!classId) return;
    try {
      await returnToStudents(classId, groupId);
      setToast({ message: 'Writing returned to students for revision.', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to return writing', type: 'error' });
    }
  };

  const handleConfirmDeleteGroup = async () => {
    if (!classId || !confirmDeleteGroup) return;
    try {
      await deleteGroupSafely(classId, confirmDeleteGroup.id);
      setToast({ message: `Deleted group "${confirmDeleteGroup.name}".`, type: 'success' });
      setConfirmDeleteGroup(null);
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to delete group', type: 'error' });
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!classId || !confirmRemoveMember) return;
    try {
      await removeGroupMember(classId, confirmRemoveMember.groupId, confirmRemoveMember.uid);
      setToast({ message: `Removed ${confirmRemoveMember.name} from group.`, type: 'success' });
      setConfirmRemoveMember(null);
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to remove member', type: 'error' });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err: any) {
      setToast({ message: 'Failed to sign out', type: 'error' });
    }
  };

  const breadcrumbs = (
    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold">
      <Link to="/teacher/dashboard" className="text-slate-400 hover:text-slate-700 transition">
        Classes
      </Link>
      <span className="text-slate-300">/</span>
      <span className="text-slate-800 font-bold truncate max-w-[200px]">
        {cls?.title || 'Class Detail'}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col justify-between">
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
          {/* Back button & quick action row */}
          <div className="flex items-center justify-between mb-6">
            <Link
              to="/teacher/dashboard"
              className="group inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-900 transition"
            >
              <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
              <span>Back to Classrooms</span>
            </Link>

            <div className="flex items-center gap-3">
              <Link to={`/teacher/classes/${classId}/monitor`}>
                <Button
                  size="sm"
                  variant="secondary"
                  className="font-bold text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-2xs"
                >
                  <Eye className="h-4 w-4 text-orange-600" />
                  <span>Live Monitoring</span>
                </Button>
              </Link>

              <Button
                size="sm"
                variant="ws-primary"
                onClick={() => setShowAddGroup(true)}
                className="text-xs py-2 px-4 shadow-xs"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                <span>Add Group</span>
              </Button>
            </div>
          </div>

          {/* Class Hero Header Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs mb-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200/60 px-3 py-1 text-xs font-bold text-orange-700">
                    <Sparkles className="h-3.5 w-3.5 text-orange-600" />
                    <span>Writing Classroom</span>
                  </div>
                  {cls && <StatusBadge status={cls.status} />}
                </div>

                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                  {classLoading ? 'Loading classroom...' : cls?.title || 'Class Detail'}
                </h1>

                {cls?.topic ? (
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 max-w-3xl">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Writing Topic / Prompt:
                    </p>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed">
                      {cls.topic}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">No specific prompt set for this class.</p>
                )}
              </div>

              {/* Quick Info & Code Pill */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                {cls && (
                  <div className="rounded-2xl border-2 border-orange-200 bg-orange-50/70 p-4 text-center">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-orange-700/80 mb-1">
                      Student Access Code
                    </div>
                    <div className="text-2xl font-black font-mono tracking-widest text-orange-950 my-1">
                      {cls.code}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-orange-200 px-3 py-1.5 text-xs font-bold text-orange-800 hover:bg-orange-100 transition shadow-2xs focus:outline-none"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-green-600" />
                          <span>Copied to Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-orange-600" />
                          <span>Copy Class Code</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs font-semibold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span>{studentCount} Students Enrolled</span>
                  </span>
                  <span>·</span>
                  <span>{groups.length} Groups</span>
                </div>
              </div>
            </div>
          </div>

          {/* Two-Column Workspace Layout: Left Groups Grid (2/3), Right Local Timer (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Writing Groups Section (2 Columns on large screens) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    Writing Groups ({groups.length})
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Collaborative teams writing essays for this class
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowAddGroup(true)}
                  className="text-xs font-bold"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Group</span>
                </Button>
              </div>

              {groupsLoading ? (
                <div className="text-center py-16 text-slate-400 font-medium">
                  Loading class groups...
                </div>
              ) : groups.length === 0 ? (
                <EmptyState
                  icon={<Users className="h-8 w-8 text-orange-600" />}
                  title="No writing groups yet"
                  description="Create student groups so they can start writing essays collaboratively."
                  action={
                    <Button variant="ws-primary" onClick={() => setShowAddGroup(true)}>
                      <Plus className="h-4 w-4 stroke-[3]" />
                      <span>Add First Group</span>
                    </Button>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {groups.map((group, index) => {
                    const isOrange = index % 2 === 0;
                    const maxMembers = group.maxMembers ?? 4;
                    const voteInfo = votesByGroup[group.id] ?? { count: 0, names: [] };
                    const isWinner = winnerIds.has(group.id);
                    const isSubmitted = group.status !== 'WRITING';

                    return (
                      <div
                        key={group.id}
                        className="group relative flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-xs transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xl overflow-hidden"
                      >
                        {/* Top accent line */}
                        <div
                          className={`absolute top-0 inset-x-0 h-1.5 ${
                            isOrange ? 'bg-orange-500' : 'bg-green-600'
                          }`}
                        />

                        <div>
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                                  isOrange
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {group.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-base font-bold text-slate-900 truncate">
                                  {group.name}
                                </h3>
                                <p className="text-[11px] font-semibold text-slate-400">
                                  {group.members.length} / {maxMembers} members
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <StatusBadge status={group.status} />
                              {isWinner && <WinnerBadge />}
                            </div>
                          </div>

                          {group.prompt && (
                            <p className="mb-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 line-clamp-2 border border-slate-100">
                              {group.prompt}
                            </p>
                          )}

                          {/* Members list with remove action */}
                          <div className="mb-4 space-y-1.5">
                            {group.members.length === 0 ? (
                              <p className="text-xs italic text-slate-400">No students joined yet</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {group.members.map((m) => (
                                  <span
                                    key={m.uid}
                                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
                                  >
                                    <span>{m.name}</span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setConfirmRemoveMember({
                                          groupId: group.id,
                                          uid: m.uid,
                                          name: m.name,
                                        })
                                      }
                                      className="text-slate-400 hover:text-red-600 transition"
                                      title={`Remove ${m.name}`}
                                      aria-label={`Remove ${m.name}`}
                                    >
                                      <UserMinus size={12} />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Capacity + Votes row */}
                          <div className="flex items-center justify-between gap-2 mb-4">
                            <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600">
                              <span className="text-[11px] text-slate-400">Cap:</span>
                              <button
                                type="button"
                                disabled={maxMembers <= Math.max(1, group.members.length)}
                                onClick={() => handleCapacityChange(group.id, maxMembers - 1)}
                                className="rounded p-0.5 hover:bg-slate-200 disabled:opacity-40"
                                aria-label="Decrease capacity"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="w-4 text-center">{maxMembers}</span>
                              <button
                                type="button"
                                disabled={maxMembers >= 20}
                                onClick={() => handleCapacityChange(group.id, maxMembers + 1)}
                                className="rounded p-0.5 hover:bg-slate-200 disabled:opacity-40"
                                aria-label="Increase capacity"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                            <VoteCount count={voteInfo.count} voterNames={voteInfo.names} />
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                          <Link
                            to={`/teacher/classes/${classId}/monitor`}
                            className="flex-1 min-w-[70px]"
                          >
                            <Button
                              size="sm"
                              variant="secondary"
                              className="w-full text-xs font-bold py-2 flex items-center justify-center gap-1"
                            >
                              <Eye className="h-3.5 w-3.5 text-slate-500" />
                              <span>Live</span>
                            </Button>
                          </Link>

                          <Link
                            to={`/teacher/classes/${classId}/groups/${group.id}/review`}
                            className="flex-1 min-w-[80px]"
                          >
                            <Button
                              size="sm"
                              variant="ws-primary"
                              className="w-full text-xs font-bold py-2 flex items-center justify-center gap-1"
                            >
                              <FileEdit className="h-3.5 w-3.5" />
                              <span>Review</span>
                            </Button>
                          </Link>

                          {isSubmitted && (
                            <button
                              type="button"
                              onClick={() => handleReturnGroup(group.id)}
                              title="Return to students"
                              aria-label="Return to students"
                              className="rounded-xl border border-amber-200 bg-amber-50 p-2 text-amber-700 hover:bg-amber-100 transition"
                            >
                              <Undo2 size={14} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setConfirmDeleteGroup({ id: group.id, name: group.name })}
                            title="Delete group"
                            aria-label="Delete group"
                            className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Synchronized Timer + Voting Config */}
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Synchronized Timer
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Shared countdown synced across all student screens
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <Clock3 size={14} className="text-orange-500" /> Writing Timer
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase ${
                      timerState.status === 'running'
                        ? 'bg-orange-100 text-orange-800'
                        : timerState.status === 'paused'
                        ? 'bg-sky-100 text-sky-800'
                        : timerState.status === 'expired'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {timerState.status}
                  </span>
                </div>

                <div
                  className={`text-center font-mono text-4xl font-black tracking-tight py-3 rounded-2xl border ${
                    timerState.status === 'expired'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : timerState.status === 'running' && timerState.remaining <= 60
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : 'border-slate-100 bg-slate-50 text-slate-900'
                  }`}
                >
                  {formattedTimer}
                </div>

                {timerState.status === 'idle' && (
                  <div className="flex flex-wrap gap-1.5">
                    {[5, 10, 15, 25, 45].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setTimerMinutesInput(m)}
                        className={`rounded-xl px-2.5 py-1 text-xs font-bold border transition ${
                          timerMinutesInput === m
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {timerState.status === 'idle' && (
                    <button
                      type="button"
                      onClick={() => classId && startClassTimer(classId, timerMinutesInput * 60)}
                      className="ws-btn-primary flex-1 py-2.5 text-xs"
                    >
                      <Play size={14} /> Start
                    </button>
                  )}
                  {timerState.status === 'running' && (
                    <button
                      type="button"
                      onClick={() => classId && pauseClassTimer(classId, timerState.remaining)}
                      className="ws-btn-secondary flex-1 py-2.5 text-xs"
                    >
                      <Pause size={14} /> Pause
                    </button>
                  )}
                  {timerState.status === 'paused' && (
                    <button
                      type="button"
                      onClick={() => classId && resumeClassTimer(classId, timerState.remaining)}
                      className="ws-btn-primary flex-1 py-2.5 text-xs"
                    >
                      <Play size={14} /> Resume
                    </button>
                  )}
                  {timerState.status !== 'idle' && (
                    <button
                      type="button"
                      onClick={() => classId && resetClassTimer(classId, timerMinutesInput * 60)}
                      className="ws-btn-secondary py-2.5 px-3 text-xs"
                      aria-label="Reset timer"
                    >
                      <RotateCcw size={14} /> Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Votes per student configuration */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <Heart size={14} className="text-rose-500" /> Votes per student
                  </span>
                  <span className="text-xs font-semibold text-slate-400">1–20</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={(cls?.votesPerStudent ?? 1) <= 1}
                    onClick={() => handleVotesPerStudentChange((cls?.votesPerStudent ?? 1) - 1)}
                    className="ws-btn-secondary px-3 py-2"
                    aria-label="Decrease votes per student"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-2xl font-black text-slate-900">
                    {cls?.votesPerStudent ?? 1}
                  </span>
                  <button
                    type="button"
                    disabled={(cls?.votesPerStudent ?? 1) >= 20}
                    onClick={() => handleVotesPerStudentChange((cls?.votesPerStudent ?? 1) + 1)}
                    className="ws-btn-secondary px-3 py-2"
                    aria-label="Increase votes per student"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Students who have submitted their writing can vote for up to {cls?.votesPerStudent ?? 1} other group(s).
                </p>
              </div>

              {/* Tips panel */}
              <div className="rounded-3xl border border-slate-200 bg-white/70 p-5 text-xs text-slate-500 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <BookOpen className="h-4 w-4 text-orange-600" />
                  <span>Teacher Tip</span>
                </div>
                <p className="leading-relaxed">
                  When the timer expires, student editors lock automatically and open groups finalize to Submitted.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Group Creation Modal */}
      <GroupForm
        open={showAddGroup}
        onClose={() => setShowAddGroup(false)}
        onSubmit={handleAddGroup}
      />

      {/* Delete Group Confirmation Modal */}
      <Modal
        open={!!confirmDeleteGroup}
        onClose={() => setConfirmDeleteGroup(null)}
        title="Delete Writing Group?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete <strong>{confirmDeleteGroup?.name}</strong>? This will remove the group and its writing document.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setConfirmDeleteGroup(null)} className="flex-1">
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDeleteGroup} className="flex-1">
              Delete Group
            </Button>
          </div>
        </div>
      </Modal>

      {/* Remove Member Confirmation Modal */}
      <Modal
        open={!!confirmRemoveMember}
        onClose={() => setConfirmRemoveMember(null)}
        title="Remove Student?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Remove <strong>{confirmRemoveMember?.name}</strong> from this group? Their writing contributions will remain, but they will lose edit access.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setConfirmRemoveMember(null)} className="flex-1">
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmRemoveMember} className="flex-1">
              Remove
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
