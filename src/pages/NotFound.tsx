import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/ui';
import { BRANDING } from '@/config/branding';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#fbfaf7] flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-8">
        <Logo productName={BRANDING.productName} size="lg" />
      </div>
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-extrabold uppercase tracking-widest text-orange-500">404</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">Page not found</h1>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          The page you are looking for does not exist or may have been moved.
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="ws-btn-primary mt-6 w-full"
        >
          <ArrowLeft size={16} /> Back to Home
        </button>
      </div>
    </div>
  );
};
