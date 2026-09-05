'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [checkedSession, setCheckedSession] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/login');
      else setCheckedSession(true);
    });
    // eslint-disable-next-line
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.push('/');
      router.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!checkedSession) return <div className="auth-shell"><div className="card">Loading...</div></div>;

  return (
    <div className="auth-shell">
      <div className="card">
        <h1>Set your password</h1>
        <p style={{ color: 'var(--ink-soft)', marginTop: 0 }}>Choose a password to finish setting up your RADAR account.</p>
        {error && <div style={{ color: 'var(--rejected)', marginBottom: 10 }}>{error}</div>}
        <form onSubmit={submit}>
          <input type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <input type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
          <button className="primary" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Set password and continue'}</button>
        </form>
      </div>
    </div>
  );
}
