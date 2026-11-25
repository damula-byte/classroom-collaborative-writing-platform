import React from 'react';
import { HashRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { GraduationCap, Users, Sparkles, Check, Layers, MessageSquare, ShieldCheck } from 'lucide-react';
import { TeacherLogin } from '@/pages/auth/TeacherLogin';
import { TeacherRegister } from '@/pages/auth/TeacherRegister';
import { TeacherDashboard } from '@/pages/teacher/TeacherDashboard';
import { ClassDetail } from '@/pages/teacher/ClassDetail';
import { LiveMonitoring } from '@/pages/teacher/LiveMonitoring';
import { ReviewMode } from '@/pages/teacher/ReviewMode';
import { StudentJoin } from '@/pages/student/StudentJoin';
import { StudentWorkspace } from '@/pages/student/StudentWorkspace';
import { NotFound } from '@/pages/NotFound';
import { Logo, HeroIllustration, RoleCard } from '@/components/ui';
import { BRANDING } from '@/config/branding';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-slate-50/50 flex flex-col justify-between">
      {/* Background Radial Glow */}
      <div className="absolute inset-x-0 top-0 -z-10 h-[640px] bg-[radial-gradient(circle_at_80%_0%,rgba(22,163,74,.10),transparent_36%),radial-gradient(circle_at_15%_20%,rgba(249,115,22,.12),transparent_40%)]" />

      {/* Header */}
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Logo productName={BRANDING.productName} size="md" />
        <div className="hidden items-center gap-2 rounded-full border border-green-200 bg-white px-4 py-1.5 text-xs font-bold text-green-700 shadow-xs sm:flex">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          {BRANDING.tagline}
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto grid w-full max-w-7xl items-center gap-12 px-6 py-10 lg:grid-cols-[1.1fr_.9fr] lg:px-10 lg:py-16">
        <div>
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-xs font-bold text-orange-700 shadow-2xs">
            <Sparkles size={15} /> A focused space for classroom writing
          </div>

          {/* Headline */}
          <h1 className="max-w-2xl text-4xl font-black leading-[1.05] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Every idea deserves room to <span className="text-orange-500">grow.</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-slate-600">
            {BRANDING.subtitle}
          </p>

          {/* Role Cards Grid */}
          <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
            <RoleCard
              icon={<GraduationCap size={24} />}
              title="I'm a Teacher"
              description="Create classes, organize writing groups, guide students, and review live progress."
              ctaText="Continue as Teacher"
              color="orange"
              onClick={() => navigate('/teacher/login')}
            />
            <RoleCard
              icon={<Users size={24} />}
              title="I'm a Student"
              description="Enter your class code, join your group, and craft impactful writing together."
              ctaText="Join a Class"
              color="green"
              onClick={() => navigate('/join')}
            />
          </div>

          {/* Feature Highlights Row */}
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm font-semibold text-slate-500">
            <span className="flex items-center gap-2">
              <Check size={16} className="text-green-600 shrink-0" /> Real-time collaboration
            </span>
            <span className="flex items-center gap-2">
              <Check size={16} className="text-green-600 shrink-0" /> Teacher-guided feedback
            </span>
            <span className="flex items-center gap-2">
              <Check size={16} className="text-green-600 shrink-0" /> Saved automatically
            </span>
          </div>
        </div>

        {/* Hero Mockup Illustration */}
        <div className="w-full">
          <HeroIllustration />
        </div>
      </main>

      {/* Feature Highlights Section */}
      <section className="mx-auto w-full max-w-7xl px-6 py-12 lg:px-10 border-t border-slate-200/70">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex gap-4 items-start rounded-2xl bg-white/70 p-5 border border-slate-100 shadow-2xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Group Collaboration</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Students write collectively in assigned groups with automatic synchronization.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start rounded-2xl bg-white/70 p-5 border border-slate-100 shadow-2xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Live Teacher Guidance</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Teachers monitor live progress and insert contextual annotations on student text.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start rounded-2xl bg-white/70 p-5 border border-slate-100 shadow-2xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Classroom Centric</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Simple code-based entry for students and clear class administration for educators.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="w-full border-t border-slate-200/60 bg-white py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 text-center text-xs text-slate-400 sm:flex-row lg:px-10">
          <p>{BRANDING.footerText}</p>
          <p>© {new Date().getFullYear()} {BRANDING.productName}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/join" element={<StudentJoin />} />
        <Route path="/student/workspace/:groupId" element={<StudentWorkspace />} />
        <Route path="/teacher/login" element={<TeacherLogin />} />
        <Route path="/teacher/register" element={<TeacherRegister />} />
        <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
        <Route path="/teacher/classes/:classId" element={<ClassDetail />} />
        <Route path="/teacher/classes/:classId/monitor" element={<LiveMonitoring />} />
        <Route path="/teacher/classes/:classId/groups/:groupId/review" element={<ReviewMode />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
};

export default App;
