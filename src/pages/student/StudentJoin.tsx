import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, StatusBadge, Toast } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { useGroups } from '@/hooks/useGroup';
import { getClassByCode, registerStudent, updateStudentGroup } from '@/services';
import { Group } from '@/types';

export function StudentJoin() {
  const [classCode, setClassCode] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState(1);
  const [classId, setClassId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { loginStudent, user } = useAuth();
  const navigate = useNavigate();
  const { groups } = useGroups(classId);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cred = await loginStudent();
      if (!cred?.user) throw new Error('Authentication failed');

      const cls = await getClassByCode(classCode);
      if (!cls) {
        setError('Class not found. Check the code and try again.');
        return;
      }

      await registerStudent({
        uid: cred.user.uid,
        classId: cls.id,
        groupId: '',
        name: name.trim(),
      });

      setClassId(cls.id);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to join class');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGroup = async (group: Group) => {
    if (!user || !classId) return;
    try {
      await updateStudentGroup(classId, user.uid, group.id);
      setToast({ message: `Joined ${group.name}! Redirecting...`, type: 'success' });
      setTimeout(() => {
        navigate(`/student/workspace/${group.id}`);
      }, 1000);
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to join group', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {step === 1 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Join a Class</h2>
            <p className="text-slate-600 text-sm mb-6">Enter your class code and name to get started</p>
            <form onSubmit={handleJoin} className="space-y-4">
              <Input
                label="Class Code"
                placeholder="e.g. WRIT26"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                maxLength={6}
                required
              />
              <Input
                label="Your Name"
                placeholder="e.g. Nguyen Van A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button type="submit" loading={loading} className="w-full">
                Continue
              </Button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Select Your Group</h2>
            <p className="text-slate-600 text-sm mb-6">Choose a group to collaborate with</p>
            <div className="space-y-3">
              {groups.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No groups available</p>
              ) : (
                groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => handleSelectGroup(group)}
                    className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{group.name}</div>
                      <div className="text-xs text-slate-500">
                        {group.members.length} member(s)
                      </div>
                    </div>
                    <StatusBadge status={group.status} />
                  </button>
                ))
              )}
            </div>
            <Button
              variant="secondary"
              className="w-full mt-4"
              onClick={() => setStep(1)}
            >
              Back
            </Button>
          </div>
        )}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  );
}