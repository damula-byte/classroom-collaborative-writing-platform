import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Input } from '@/components/common';
import { AuthShell } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { User, Eye, EyeOff } from 'lucide-react';

export function TeacherLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const { loginTeacher, loginTeacherGuest, loginGoogle } = useAuth();
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await loginGoogle();
      navigate('/teacher/dashboard');
    } catch (err: any) {
      setError(err.message || 'Google login failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      setError('Please enter your teacher name');
      return;
    }
    setError('');
    setGuestLoading(true);
    try {
      await loginTeacherGuest(guestName.trim());
      navigate('/teacher/dashboard');
    } catch (err: any) {
      setError(err.message || 'Guest login failed');
    } finally {
      setGuestLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginTeacher(email, password);
      navigate('/teacher/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome, Educator"
      subtitle="Sign in to create classes, organize student groups, and facilitate collaborative writing."
      quote="“The teacher’s role is not to teach writing, but to create an environment where writers can thrive together.”"
      quoteAuthor="Classroom Collaborative Writing Experience"
    >
      <div className="space-y-6">
        {/* Error message alert */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* 1. Google Login — Primary CTA */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading || guestLoading}
          className="w-full flex items-center justify-center gap-3 px-5 py-3.5 border border-slate-300 rounded-xl bg-white hover:bg-slate-50 transition duration-150 font-bold text-slate-800 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-slate-100"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>{googleLoading ? 'Connecting Google...' : 'Continue with Google'}</span>
        </button>

        {/* 2. Guest Teacher Login — Fast frictionless access */}
        <div className="rounded-2xl border border-orange-200/80 bg-orange-50/50 p-5 shadow-2xs">
          <div className="flex items-center gap-2 mb-2 text-sm font-bold text-orange-900">
            <User className="h-4 w-4 text-orange-600" />
            Quick Guest Access
          </div>
          <p className="text-xs text-orange-700/80 mb-3 leading-relaxed">
            Try the platform immediately without a permanent password.
          </p>
          <form onSubmit={handleGuestLogin} className="space-y-3">
            <Input
              label=""
              placeholder="Enter your name (e.g. Teacher Sarah)"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              disabled={guestLoading || loading || googleLoading}
              className="bg-white"
            />
            <Button
              type="submit"
              variant="ws-primary"
              loading={guestLoading}
              disabled={loading || googleLoading}
              className="w-full py-2.5 text-sm"
            >
              Continue as Guest
            </Button>
          </form>
        </div>

        {/* 3. Divider: Email/Password login */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <button
              type="button"
              onClick={() => setShowEmailForm(!showEmailForm)}
              className="bg-white px-3 font-bold text-slate-400 hover:text-slate-700 transition"
            >
              {showEmailForm ? 'Hide Email Login' : 'Or continue with email'}
            </button>
          </div>
        </div>

        {/* 4. Email/Password Form (toggled or expanded) */}
        {showEmailForm && (
          <form onSubmit={handleEmailLogin} className="space-y-4 rounded-2xl border border-slate-200 p-5 bg-slate-50/50">
            <Input
              label="Email Address"
              type="email"
              placeholder="teacher@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading || googleLoading || guestLoading}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || googleLoading || guestLoading}
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
              loading={loading}
              disabled={googleLoading || guestLoading}
              className="w-full rounded-xl py-3 font-bold"
            >
              Sign In with Email
            </Button>
          </form>
        )}

        {/* 5. Link to Register */}
        <p className="text-center text-sm text-slate-500 pt-2">
          Don't have a teacher account?{' '}
          <Link
            to="/teacher/register"
            className="font-bold text-orange-600 hover:text-orange-700 underline underline-offset-4"
          >
            Create an account
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
