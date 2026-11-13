import React from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { PenTool, GraduationCap, Users } from 'lucide-react';
import { TeacherLogin } from '@/pages/auth/TeacherLogin';
import { TeacherRegister } from '@/pages/auth/TeacherRegister';
import { TeacherDashboard } from '@/pages/teacher/TeacherDashboard';
import { ClassDetail } from '@/pages/teacher/ClassDetail';
import { LiveMonitoring } from '@/pages/teacher/LiveMonitoring';
import { ReviewMode } from '@/pages/teacher/ReviewMode';
import { StudentJoin } from '@/pages/student/StudentJoin';
import { StudentWorkspace } from '@/pages/student/StudentWorkspace';

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white flex flex-col justify-center items-center px-4">
      <div className="max-w-xl w-full text-center space-y-8">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
          <PenTool className="w-8 h-8" />
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Writing Classroom
          </h1>
          <p className="text-lg text-slate-600">
            Realtime collaborative writing platform for classrooms. Group writing, live monitoring, and instant teacher correction.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          <Link
            to="/join"
            className="flex items-center justify-center gap-3 p-5 rounded-2xl bg-white border-2 border-indigo-100 hover:border-indigo-500 hover:shadow-md transition group text-left"
          >
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-lg">Student</div>
              <div className="text-sm text-slate-500">Join with class code</div>
            </div>
          </Link>

          <Link
            to="/teacher/login"
            className="flex items-center justify-center gap-3 p-5 rounded-2xl bg-white border-2 border-slate-200 hover:border-slate-800 hover:shadow-md transition group text-left"
          >
            <div className="p-3 bg-slate-100 text-slate-700 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-lg">Teacher</div>
              <div className="text-sm text-slate-500">Manage & live review</div>
            </div>
          </Link>
        </div>
      </div>
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
      </Routes>
    </Router>
  );
};

export default App;