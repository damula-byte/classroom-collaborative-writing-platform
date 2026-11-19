import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Input } from '@/components/common';
import { AuthShell } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff } from 'lucide-react';

export function TeacherRegister() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { registerTeacher } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your display name');
      return;
    }
    if (password.length < 6) {
      setError('Password should be at least 6 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await registerTeacher(email, password);
      // Store name in localStorage so it persists for display if needed
      if (name.trim()) {
        localStorage.setItem('teacherName', name.trim());
      }
      navigate('/teacher/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create Teacher Account"
      subtitle="Register a permanent account to manage your classrooms, assignments, and historical feedback."
      quote="“Every piece of writing begins with a single line—and every great classroom begins with an inspired teacher.”"
      quoteAuthor="Write Together · Learn Together"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <Input
          label="Display Name"
          placeholder="e.g. Teacher Michael"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={loading}
        />

        <Input
          label="Email Address"
          type="email"
          placeholder="teacher@school.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 focus:outline-none"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <Button
          type="submit"
          variant="ws-primary"
          loading={loading}
          className="w-full py-3.5 mt-2"
        >
          Complete Registration
        </Button>

        <p className="text-center text-sm text-slate-500 pt-4">
          Already have an account?{' '}
          <Link
            to="/teacher/login"
            className="font-bold text-orange-600 hover:text-orange-700 underline underline-offset-4"
          >
            Sign in here
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
