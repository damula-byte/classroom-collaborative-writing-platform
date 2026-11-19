import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button, StatusBadge, Modal, Input, Toast } from '@/components/common';
import { AppHeader, EmptyState, ClassTimer } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useClass } from '@/hooks/useClass';
import { useGroups } from '@/hooks/useGroup';
import { createGroup, getStudentCount } from '@/services';
import { BRANDING } from '@/config/branding';
import {
  Users,
  Plus,
  Copy,
  Check,
  Eye,
  FileEdit,
  ArrowLeft,
  Sparkles,
  BookOpen,
} from 'lucide-react';

interface GroupFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}

function GroupForm({ open, onClose, onSubmit }: GroupFormProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onSubmit(name.trim());
      setName('');
      onClose();
    } catch (err) {
      // handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Writing Group" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Group Name"
          placeholder="e.g. Group Alpha / Team 1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={loading}
        />
        <p className="text-xs text-slate-400">
          Students can choose or be assigned to this collaborative writing group.
        </p>
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
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Fetch actual student count from Firestore
  useEffect(() => {
    if (!classId) return;
    getStudentCount(classId).then((count) => {
      setStudentCount(count);
    });
  }, [classId]);

  const handleCopyCode = () => {
    if (!cls?.code) return;
    navigator.clipboard.writeText(cls.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAddGroup = async (name: string) => {
    if (!classId) return;
    try {
      await createGroup(classId, name);
      setToast({ message: `Group "${name}" created successfully!`, type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to create group', type: 'error' });
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

                    return (
                      <div
                        key={group.id}
                        className="group relative flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-xs transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl overflow-hidden"
                      >
                        {/* Top accent line */}
                        <div
                          className={`absolute top-0 inset-x-0 h-1.5 ${
                            isOrange ? 'bg-orange-500' : 'bg-green-600'
                          }`}
                        />

                        <div>
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold ${
                                  isOrange
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {group.name.slice(0, 2).toUpperCase()}
                              </div>
                              <h3 className="text-base font-bold text-slate-900 group-hover:text-orange-600 transition">
                                {group.name}
                              </h3>
                            </div>
                            <StatusBadge status={group.status} />
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500 mb-5">
                            <Users className="h-3.5 w-3.5 text-slate-400" />
                            <span>
                              {group.members.length} student
                              {group.members.length === 1 ? '' : 's'} assigned
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                          <Link
                            to={`/teacher/classes/${classId}/monitor`}
                            className="flex-1"
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
                            className="flex-1"
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
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Interactive Local Timer (WriteSpace experience) */}
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Session Timer
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Local countdown for active writing exercises
                </p>
              </div>

              {/* ClassTimer component (Phase 6A local state) */}
              <ClassTimer initialMinutes={15} />

              {/* Tips panel */}
              <div className="rounded-3xl border border-slate-200 bg-white/70 p-5 text-xs text-slate-500 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <BookOpen className="h-4 w-4 text-orange-600" />
                  <span>Teacher Tip</span>
                </div>
                <p className="leading-relaxed">
                  Use the countdown to keep classroom sprints on schedule. This timer runs locally in your browser and will alert you visually when time runs out.
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
