'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/api';

function SignInForm({ onRequestAccess, onForgotPassword }) {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <svg width="28" height="28" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="13" cy="13" r="11" stroke="#2dd4bf" strokeWidth="1.5" opacity="0.35" />
          <circle cx="13" cy="13" r="7" stroke="#2dd4bf" strokeWidth="1.5" opacity="0.6" />
          <circle cx="13" cy="13" r="2.5" fill="#2dd4bf" />
          <line x1="13" y1="13" x2="20.5" y2="6.5" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <h1 style={{ margin: 0 }}>RADAR</h1>
      </div>
      <p style={{ color: 'var(--ink-soft)', marginTop: 0 }}>Sign in to continue.</p>
      {error && <div style={{ color: 'var(--rejected)', marginBottom: 10 }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="primary" type="submit" disabled={busy}>Sign in</button>
      </form>
      <div style={{ marginTop: 10, fontSize: 13 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); onForgotPassword(); }}>Forgot password?</a>
      </div>
      <div style={{ marginTop: 8, fontSize: 13 }}>
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
        <h1>Request Sent</h1>
        <p style={{ color: 'var(--ink-soft)' }}>An admin will review your request and send you an invite email once approved.</p>
        <button className="ghost" onClick={onBack}>Back to sign in</button>
      </div>
    );
  }

  return (
    <div className="card">
      <h1>Request Access</h1>
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

function ForgotPasswordForm({ onBack }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) throw error;
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
        <h1>Check Your Email</h1>
        <p style={{ color: 'var(--ink-soft)' }}>If an account exists for {email}, a reset link is on its way.</p>
        <button className="ghost" onClick={onBack}>Back to sign in</button>
      </div>
    );
  }

  return (
    <div className="card">
      <h1>Reset Your Password</h1>
      <p style={{ color: 'var(--ink-soft)', marginTop: 0 }}>We'll email you a link to choose a new one.</p>
      {error && <div style={{ color: 'var(--rejected)', marginBottom: 10 }}>{error}</div>}
      <form onSubmit={submit}>
        <input type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <button className="primary" type="submit" disabled={busy}>{busy ? 'Sending...' : 'Send reset link'}</button>
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
      {mode === 'sign-in' && <SignInForm onRequestAccess={() => setMode('request')} onForgotPassword={() => setMode('forgot')} />}
      {mode === 'request' && <RequestAccessForm onBack={() => setMode('sign-in')} />}
      {mode === 'forgot' && <ForgotPasswordForm onBack={() => setMode('sign-in')} />}
    </div>
  );
}
