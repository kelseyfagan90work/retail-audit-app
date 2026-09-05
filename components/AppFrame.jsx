'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import Nav from './Nav';

export default function AppFrame({ adminOnly = false, children }) {
  const user = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (user === null) router.push('/login');
    else if (user === 'needs-password') router.push('/set-password');
  }, [user, router]);

  if (user === undefined) return <div className="app-shell">Loading...</div>;
  if (user === null) return null;
  if (user === 'needs-password') return null;
  if (user === 'unprovisioned') {
    return (
      <div className="app-shell">
        <div className="card empty-state">
          <h2>Account not set up yet</h2>
          <p>You're logged in, but your account isn't linked to a role yet. Add yourself to the <code>profiles</code> table in Supabase (see the README).</p>
        </div>
      </div>
    );
  }
  if (adminOnly && user.role !== 'admin') {
    return (
      <div>
        <Nav user={user} />
        <div className="app-shell">
          <div className="card empty-state">This page is admin-only.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Nav user={user} />
      <div className="app-shell">{children(user)}</div>
    </div>
  );
}
