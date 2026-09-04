'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function HomePage() {
  const user = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (user === null) router.replace('/login');
    else if (user && user !== 'unprovisioned') router.replace('/dashboard');
  }, [user, router]);

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

  return <div className="app-shell">Loading...</div>;
}
