import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button, StatusBadge, Toast } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { useQuotaMonitor, QuotaWarning } from '@/hooks/useQuotaMonitor';
import { useClassGroups } from '@/hooks/useGroup';
import { ClassForm } from '@/components/teacher/ClassForm';
import { subscribeToClasses, createClass, deleteClass, getStudentCount } from '@/services';
import { Class } from '@/types';

export function TeacherDashboard() {
  const { user, logout } = useAuth();
  const { metrics, limits } = useQuotaMonitor();
  const [classes, setClasses] = useState<Class[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
      await createClass({
        ...data,
        teacherId: user!.uid,
        teacherName: user!.displayName || user!.email || 'Teacher',
      });
      setToast({ message: 'Class created successfully!', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to create class', type: 'error' });
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;
    try {
      await deleteClass(classId);
      setToast({ message: 'Class deleted', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to delete class', type: 'error' });
    }
  };

  const totalStudents = Object.values(studentCounts).reduce((a, b) => a + b, 0);
  const activeClasses = classes.filter((cls) => cls.status === 'ACTIVE').length;
  const groupsWriting = groups.filter((g) => g.status === 'WRITING').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-slate-900">Writing Classroom</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">
                {user?.isAnonymous ? 'Anonymous' : user?.email}
              </span>
              <Button variant="ghost" onClick={() => logout()}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-slate-600 mt-1">Manage your classes and monitor student progress</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-4xl font-bold text-indigo-600">{activeClasses}</div>
            <div className="text-slate-600 text-sm mt-1">Active Classes</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-4xl font-bold text-green-600">{totalStudents}</div>
            <div className="text-slate-600 text-sm mt-1">Total Students</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-4xl font-bold text-yellow-600">{groupsWriting}</div>
            <div className="text-slate-600 text-sm mt-1">Groups Writing</div>
          </div>
        </div>

        <QuotaWarning metrics={metrics} limits={limits} />

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Your Classes</h3>
            <Button onClick={() => setShowCreateModal(true)}>+ New Class</Button>
          </div>

          {classes.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              No classes yet. Click "+ New Class" to create one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls) => (
                <div key={cls.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-slate-900">{cls.title}</h4>
                      <span className="inline-block px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-mono mt-1">
                        {cls.code}
                      </span>
                    </div>
                    <StatusBadge status={cls.status} />
                  </div>
                  <p className="text-sm text-slate-500 mb-3 line-clamp-2">{cls.topic}</p>
                  <div className="flex gap-2">
                    <Link to={`/teacher/classes/${cls.id}`} className="flex-1">
                      <Button size="sm" variant="secondary" className="w-full">
                        Manage
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteClass(cls.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <ClassForm
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateClass}
      />

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