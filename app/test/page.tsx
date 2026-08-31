'use client';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-4">Test Page - Client Only</h1>
      <p className="text-slate-300 mb-4">
        If you can see this page without React Error #418, the problem is with SSR/hydration.
      </p>
      <div className="bg-slate-800 p-4 rounded-lg">
        <p className="text-sm">Current time: {new Date().toISOString()}</p>
      </div>
    </div>
  );
}
