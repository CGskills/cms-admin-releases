'use client';

export default function TestEnvPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h1>Environment Variables Test</h1>
      <div style={{ marginTop: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <strong>NEXT_PUBLIC_SUPABASE_URL:</strong>
          <div style={{ color: url ? 'green' : 'red' }}>
            {url ? `✅ ${url}` : '❌ Not set'}
          </div>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <strong>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:</strong>
          <div style={{ color: key ? 'green' : 'red' }}>
            {key ? `✅ ${key.substring(0, 20)}...` : '❌ Not set'}
          </div>
        </div>
      </div>
    </div>
  );
}
