import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { isConfigured } from './config/firebase';
import './index.css';

function SetupNotice() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center p-4 bg-indigo-600 rounded-2xl">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v7m0 0l-4-4m4 4l4-4M4 13l4 4m0-4l-4-4m0 0l4-4m0 4h12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold">Firebase Not Configured</h1>
        <p className="text-slate-400">
          Create a Firebase project and set credentials in <code className="bg-slate-700 px-2 py-1 rounded">.env</code>.
        </p>
        <div className="bg-slate-800 rounded-xl p-4 text-left text-sm">
          <p className="font-semibold mb-2 text-slate-300">Steps:</p>
          <ol className="list-decimal list-inside space-y-1 text-slate-400">
            <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noopener" className="text-indigo-400">Firebase Console</a></li>
            <li>Create a new project</li>
            <li>Enable Firestore and RTDB</li>
            <li>Copy config values to <code className="bg-slate-700 px-1 rounded">.env</code></li>
            <li>Run <code className="bg-slate-700 px-1 rounded">npm run dev</code></li>
          </ol>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isConfigured ? <App /> : <SetupNotice />}
  </React.StrictMode>
);