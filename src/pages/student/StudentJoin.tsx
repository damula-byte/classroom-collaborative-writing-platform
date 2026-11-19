import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, StatusBadge, Toast } from '@/components/common';
import { AuthShell } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useGroups } from '@/hooks/useGroup';
import { getClassByCode, registerStudent, updateStudentGroup } from '@/services';
import { Group } from '@/types';
import { Users, ArrowRight, CheckCircle2 } from 'lucide-react';

export function StudentJoin() {
  const [classCode, setClassCode] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState(1);
  const [classId, setClassId] = useState<string | null>(null);
  const [classNameTitle, setClassNameTitle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [joiningGroup, setJoiningGroup] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { loginStudent, user } = useAuth();
  const navigate = useNavigate();
  const { groups } = useGroups(classId);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classCode.trim()) {
      setError('Please enter your 6-character class code');
      return;
    }
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const cred = await loginStudent();
      if (!cred?.user) throw new Error('Authentication failed');

      const cls = await getClassByCode(classCode.trim().toUpperCase());
      if (!cls) {
        setError('Class not found. Please verify the code with your teacher.');
        return;
      }

      await registerStudent({
        uid: cred.user.uid,
        classId: cls.id,
        groupId: '',
        name: name.trim(),
      });

      setClassId(cls.id);
      setClassNameTitle(cls.title || 'Writing Classroom');
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to join class. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGroup = async (group: Group) => {
    if (!user || !classId) return;
    setJoiningGroup(group.id);
    try {
      await updateStudentGroup(classId, user.uid, group.id);
      setToast({ message: `Joined ${group.name}! Redirecting to workspace...`, type: 'success' });
      setTimeout(() => {
        navigate(`/student/workspace/${group.id}`);
      }, 800);
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to join group', type: 'error' });
      setJoiningGroup(null);
    }
  };

  return (
    <AuthShell
      title={step === 1 ? 'Join Your Class' : 'Choose Your Group'}
      subtitle={
        step === 1
          ? 'Enter your class code and name to jump into your collaborative writing session.'
          : `You are in ${classNameTitle}. Select an available writing group to begin.`
      }
      quote="“Write with confidence. Collaborate with care. Your voice matters in every word.”"
      quoteAuthor="Student Collaborative Space"
    >
      <div className="space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center gap-2 pb-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              step >= 1 ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}
          >
            1
          </div>
          <div className={`h-1 flex-1 rounded-full ${step === 2 ? 'bg-green-600' : 'bg-slate-200'}`} />
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              step === 2 ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}
          >
            2
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* STEP 1: Class Code + Student Name */}
        {step === 1 ? (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <Input
                label="Class Code"
                placeholder="e.g. WRIT26"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                maxLength={6}
                required
                disabled={loading}
                className="font-mono uppercase tracking-widest text-lg font-bold"
              />
              <p className="mt-1 text-xs text-slate-400">Ask your teacher for the 6-character code.</p>
            </div>

            <Input
              label="Your Full Name"
              placeholder="e.g. Nguyen Van An"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />

            <Button
              type="submit"
              variant="ws-green"
              loading={loading}
              className="w-full py-3.5 mt-2"
            >
              Continue to Group Selection
            </Button>
          </form>
        ) : (
          /* STEP 2: Group Selection */
          <div className="space-y-4">
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {groups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
                  <Users className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-sm font-semibold">No groups created yet.</p>
                  <p className="text-xs mt-1">Please ask your teacher to set up writing groups.</p>
                </div>
              ) : (
                groups.map((group) => {
                  const isSelected = joiningGroup === group.id;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      disabled={joiningGroup !== null}
                      onClick={() => handleSelectGroup(group)}
                      className={`group w-full flex items-center justify-between p-4 rounded-2xl border-2 transition text-left focus:outline-none ${
                        isSelected
                          ? 'border-green-600 bg-green-50/60 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-green-500 hover:bg-green-50/30'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700 font-bold text-sm">
                          {group.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-green-800 transition">
                            {group.name}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{group.members.length} member(s)</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <StatusBadge status={group.status} />
                        {isSelected ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 animate-pulse" />
                        ) : (
                          <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-green-600" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <Button
              type="button"
              variant="secondary"
              className="w-full mt-2"
              onClick={() => setStep(1)}
              disabled={joiningGroup !== null}
            >
              Back to Code Entry
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
    </AuthShell>
  );
}
