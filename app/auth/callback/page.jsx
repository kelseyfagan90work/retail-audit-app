'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function run() {
      const supabase = createClient();
      const code = new URLSearchParams(window.location.search).get('code');

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          // Older-style invite links put the session straight in the URL
          // hash, which the browser client parses automatically on load —
          // just confirm that actually left us with a session.
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('This invite link is invalid or has expired.');
        }
        router.replace('/set-password');
      } catch (e) {
        setError(e.message || 'This invite link is invalid or has expired.');
      }
    }
    run();
  }, [router]);

  return (
    <div className="auth-shell">
      <div className="card">
        {error ? (
          <>
            <h1>Link problem</h1>
            <p style={{ color: 'var(--rejected)' }}>{error}</p>
            <a href="/login">Back to sign in</a>
          </>
        ) : (
          <p style={{ color: 'var(--ink-soft)' }}>Signing you in...</p>
        )}
      </div>
    </div>
  );
}
