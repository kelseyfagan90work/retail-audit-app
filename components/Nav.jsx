'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Nav({ user }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const link = (href, label) => (
    <Link href={href} className={pathname.startsWith(href) ? 'active' : ''}>{label}</Link>
  );

  return (
    <div className="top-nav">
      <div className="left">
        <Link href="/dashboard" className="nav-brand">
          <svg className="nav-brand-mark" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="13" cy="13" r="11" stroke="#2dd4bf" strokeWidth="1.5" opacity="0.35" />
            <circle cx="13" cy="13" r="7" stroke="#2dd4bf" strokeWidth="1.5" opacity="0.6" />
            <circle cx="13" cy="13" r="2.5" fill="#2dd4bf" />
            <line x1="13" y1="13" x2="20.5" y2="6.5" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="nav-brand-name">RADAR</span>
        </Link>
        <div className="links">
          {link('/dashboard', 'Dashboard')}
          {link('/audits', 'Audits')}
          {link('/reports', 'Reports')}
          {user.role === 'admin' && link('/templates', 'Templates')}
          {user.role === 'admin' && link('/stores', 'Stores')}
          {user.role === 'admin' && link('/users', 'Users')}
        </div>
      </div>
      <div className="who">
        <span>{user.displayName} · {user.role}</span>
        <button className="ghost" onClick={signOut}>Sign out</button>
      </div>
    </div>
  );
}
