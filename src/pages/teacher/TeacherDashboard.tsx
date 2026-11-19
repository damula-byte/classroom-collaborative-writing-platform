import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, StatusBadge, Toast, Modal } from '@/components/common';
import { AppHeader, EmptyState } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useQuotaMonitor, QuotaWarning } from '@/hooks/useQuotaMonitor';
import { useClassGroups } from '@/hooks/useGroup';
import { ClassForm } from '@/components/teacher/ClassForm';
import { subscribeToClasses, createClass, deleteClass, getStudentCount } from '@/services';
import { Class } from '@/types';
import { BRANDING } from '@/config/branding';
import {
  Plus,
  BookOpen,
  Users,
  Layers,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

export function TeacherDashboard() {
  const { user, teacherName, logout } = useAuth();
  const { metrics, limits } = useQuotaMonitor();
  const [classes, setClasses] = useState<Class[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingClass, setDeletingClass] = useState<Class | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const navigate = useNavigate();
  const classIds = classes.map((c) => c.id);
  const { groups } = useClassGroups(classIds);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToClasses(user.uid, (cls) => {
      setClasses(cls);
      cls.forEach((c) => {
        getStudentCount(c.id).then((count) => {
          setStudentCounts((prev) => ({ ...prev, [c.id]: count }));
        });
      });
    });
    return unsub;
  }, [user]);

  const handleCreateClass = async (data: {
    title: string;
    topic: string;
    code: string;
    allowStudentGroupSelection: boolean;
  }) => {
    try {
      const classId = await createClass({
        ...data,
        teacherId: user!.uid,
        teacherName: teacherName || 'Teacher',
      });
      const newClass: Class = {
        id: classId,
        ...data,
        teacherId: user!.uid,
        teacherName: teacherName || 'Teacher',
        status: 'ACTIVE',
        allowStudentGroupSelection: data.allowStudentGroupSelection,
        studentCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setClasses((prev) => [newClass, ...prev]);
      setToast({ message: 'Class created successfully!', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to create class', type: 'error' });
    }
  };

  const confirmDeleteClass = async () => {
    if (!deletingClass) return;
    setDeleteLoading(true);
    try {
      await deleteClass(deletingClass.id);
      setToast({ message: `Class "${deletingClass.title}" deleted`, type: 'success' });
      setDeletingClass(null);
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to delete class', type: 'error' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err: any) {
      setToast({ message: 'Failed to sign out', type: 'error' });
    }
  };

  // Metrics derived from actual live data
  const totalStudents = Object.values(studentCounts).reduce((a, b) => a + b, 0);
  const activeClasses = classes.filter((cls) => cls.status === 'ACTIVE').length;
  const groupsWriting = groups.filter((g) => g.status === 'WRITING').length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col justify-between">
      <div>
        {/* Sticky App Header */}
        <AppHeader
          productName={BRANDING.productName}
          userName={teacherName}
          roleLabel="Teacher"
          roleVariant="orange"
          onLogout={handleLogout}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          {/* Welcome & Action Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600 mb-1">
                <Sparkles className="h-4 w-4" />
                <span>Educator Workspace</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                Welcome back, {teacherName}
              </h1>
              <p className="text-sm sm:text-base text-slate-500 mt-1">
                Manage your classrooms, organize student writing teams, and review essays in real-time.
              </p>
            </div>

            <Button
              variant="ws-primary"
              onClick={() => setShowCreateModal(true)}
              className="py-3 px-6 shadow-sm self-start sm:self-auto"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Create New Class</span>
            </Button>
          </div>

          {/* Statistics Row (3 cards: Orange, Green, Yellow) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            {/* Active Classes Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex items-center gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                <BookOpen className="h-7 w-7" />
              </div>
              <div>
                <div className="text-3xl font-black text-slate-900">{activeClasses}</div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                  Active Classes
                </div>
              </div>
            </div>

            {/* Total Students Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex items-center gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-green-100 text-green-700">
                <Users className="h-7 w-7" />
              </div>
              <div>
                <div className="text-3xl font-black text-slate-900">{totalStudents}</div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                  Total Students
                </div>
              </div>
            </div>

            {/* Groups Writing Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex items-center gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <Layers className="h-7 w-7" />
              </div>
              <div>
                <div className="text-3xl font-black text-slate-900">{groupsWriting}</div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                  Groups Writing
                </div>
              </div>
            </div>
          </div>

          {/* Quota Warning if approaching free-tier limit */}
          <div className="mb-8">
            <QuotaWarning metrics={metrics} limits={limits} />
          </div>

          {/* Class Grid Section */}
          <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Your Classrooms</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {classes.length} {classes.length === 1 ? 'class' : 'classes'} enrolled in your workspace
                </p>
              </div>

              {classes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 transition"
                >
                  + Add another
                </button>
              )}
            </div>

            {classes.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="h-8 w-8 text-orange-600" />}
                title="No classrooms created yet"
                description="Get started by creating your first writing classroom. You will receive a 6-character code to share with your students."
                action={
                  <Button variant="ws-primary" onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 stroke-[3]" />
                    <span>Create Your First Class</span>
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map((cls, index) => {
                  const studentCount = studentCounts[cls.id] || 0;
                  const isTopOrange = index % 2 === 0;

                  return (
                    <div
                      key={cls.id}
                      className="group relative flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-xs transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl overflow-hidden"
                    >
                      {/* Top colored accent bar */}
                      <div
                        className={`absolute top-0 inset-x-0 h-1.5 ${
                          isTopOrange ? 'bg-orange-500' : 'bg-green-600'
                        }`}
                      />

                      <div>
                        {/* Header: Title + Status */}
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <h3 className="text-lg font-bold tracking-tight text-slate-900 line-clamp-1 group-hover:text-orange-600 transition">
                            {cls.title}
                          </h3>
                          <StatusBadge status={cls.status} />
                        </div>

                        {/* Topic / Prompt Preview */}
                        <p className="text-xs sm:text-sm text-slate-500 mb-4 line-clamp-2 leading-relaxed">
                          {cls.topic || 'No topic assigned.'}
                        </p>

                        {/* Class Info Badges */}
                        <div className="flex items-center gap-2 mb-6">
                          {/* Code Copy Badge */}
                          <button
                            type="button"
                            onClick={() => handleCopyCode(cls.code)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50/80 px-2.5 py-1 text-xs font-mono font-bold text-orange-800 hover:bg-orange-100 transition focus:outline-none"
                            title="Click to copy student code"
                          >
                            <span>Code: {cls.code}</span>
                            {copiedCode === cls.code ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-orange-600" />
                            )}
                          </button>

                          {/* Student Count Badge */}
                          <span className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            <Users className="h-3 w-3 text-slate-400" />
                            <span>{studentCount} student{studentCount === 1 ? '' : 's'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                        <Link to={`/teacher/classes/${cls.id}`} className="flex-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="w-full font-bold text-xs py-2 flex items-center justify-center gap-1.5"
                          >
                            <span>Open Classroom</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </Link>

                        <button
                          type="button"
                          onClick={() => setDeletingClass(cls)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-300 hover:bg-red-50 hover:text-red-600 transition focus:outline-none"
                          title="Delete class"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Class Creation Modal */}
      <ClassForm
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateClass}
      />

      {/* Class Deletion Confirmation Modal */}
      <Modal
        open={deletingClass !== null}
        onClose={() => !deleteLoading && setDeletingClass(null)}
        title="Delete Classroom"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 border border-red-100 text-red-900">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold">This action cannot be undone.</p>
              <p className="text-xs text-red-700/90 mt-1">
                Are you sure you want to permanently delete{' '}
                <span className="font-bold">"{deletingClass?.title}"</span> (Code:{' '}
                <span className="font-mono">{deletingClass?.code}</span>)? All groups and student
                associations will be removed.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeletingClass(null)}
              disabled={deleteLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={deleteLoading}
              onClick={confirmDeleteClass}
              className="flex-1"
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
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
