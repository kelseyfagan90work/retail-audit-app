'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [mode, setMode] = useState('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/');
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setNotice('Account created. If email confirmation is on for your project, check your inbox — otherwise you can sign in now.');
        setMode('sign-in');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="card">
        <h1>Retail Audit</h1>
        <p style={{ color: 'var(--ink-soft)', marginTop: 0 }}>
          {mode === 'sign-in' ? 'Sign in to continue.' : 'Create an account to get started.'}
        </p>
        {error && <div style={{ color: 'var(--rejected)', marginBottom: 10 }}>{error}</div>}
        {notice && <div style={{ color: 'var(--approved)', marginBottom: 10 }}>{notice}</div>}
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <button className="primary" type="submit" disabled={busy}>
            {mode === 'sign-in' ? 'Sign in' : 'Sign up'}
          </button>
        </form>
        <div style={{ marginTop: 14, fontSize: 13 }}>
          {mode === 'sign-in' ? (
            <span>New here? <a href="#" onClick={(e) => { e.preventDefault(); setMode('sign-up'); }}>Create an account</a></span>
          ) : (
            <span>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setMode('sign-in'); }}>Sign in</a></span>
          )}
        </div>
      </div>
    </div>
  );
}
