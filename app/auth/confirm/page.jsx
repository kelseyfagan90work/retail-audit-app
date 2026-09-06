'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function ConfirmInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const tokenHash = params.get('token_hash');
  const type = params.get('type') || 'invite';

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (error) throw error;
      router.push('/set-password');
    } catch (e) {
      setError(e.message || 'This link is invalid or has expired.');
    } finally {
      setBusy(false);
    }
  }

  if (!tokenHash) {
    return (
      <div className="card">
        <h1>Link Problem</h1>
        <p style={{ color: 'var(--rejected)' }}>This link is missing required information.</p>
        <a href="/login">Back to sign in</a>
      </div>
    );
  }

  return (
    <div className="card">
      <h1>{type === 'recovery' ? 'Reset Your Password' : "You're Invited"}</h1>
      <p style={{ color: 'var(--ink-soft)' }}>Click below to continue.</p>
      {error && (
        <div style={{ color: 'var(--rejected)', marginBottom: 12 }}>
          {error}<br /><a href="/login">Back to sign in</a>
        </div>
      )}
      {!error && <button className="primary" onClick={confirm} disabled={busy}>{busy ? 'Confirming...' : 'Continue'}</button>}
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <div className="auth-shell">
      <Suspense fallback={<div className="card">Loading...</div>}>
        <ConfirmInner />
      </Suspense>
    </div>
  );
}
