'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/api';

function SignInForm({ onRequestAccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h1>RADAR</h1>
      <p style={{ color: 'var(--ink-soft)', marginTop: 0 }}>Sign in to continue.</p>
      {error && <div style={{ color: 'var(--rejected)', marginBottom: 10 }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="primary" type="submit" disabled={busy}>Sign in</button>
      </form>
      <div style={{ marginTop: 14, fontSize: 13 }}>
        New here? <a href="#" onClick={(e) => { e.preventDefault(); onRequestAccess(); }}>Request access</a>
      </div>
    </div>
  );
}

function RequestAccessForm({ onBack }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.requestInvite({ name, email, message });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="card">
        <h1>Request sent</h1>
        <p style={{ color: 'var(--ink-soft)' }}>An admin will review your request and send you an invite email once approved.</p>
        <button className="ghost" onClick={onBack}>Back to sign in</button>
      </div>
    );
  }

  return (
    <div className="card">
      <h1>Request access</h1>
      <p style={{ color: 'var(--ink-soft)', marginTop: 0 }}>Tell us who you are and an admin will send you an invite.</p>
      {error && <div style={{ color: 'var(--rejected)', marginBottom: 10 }}>{error}</div>}
      <form onSubmit={submit}>
        <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <textarea placeholder="Anything else? (optional)" value={message} onChange={(e) => setMessage(e.target.value)} style={{ minHeight: 60 }} />
        <button className="primary" type="submit" disabled={busy}>{busy ? 'Sending...' : 'Send request'}</button>
      </form>
      <div style={{ marginTop: 14, fontSize: 13 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }}>Back to sign in</a>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState('sign-in');

  return (
    <div className="auth-shell">
      {mode === 'sign-in' ? (
        <SignInForm onRequestAccess={() => setMode('request')} />
      ) : (
        <RequestAccessForm onBack={() => setMode('sign-in')} />
      )}
    </div>
  );
}
