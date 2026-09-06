'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const ADMIN_PATHS = ['/templates', '/stores', '/users'];

export default function Nav({ user }) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminOpen, setAdminOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setAdminOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const link = (href, label) => (
    <Link href={href} className={pathname.startsWith(href) ? 'active' : ''}>{label}</Link>
  );

  const isAdminSectionActive = ADMIN_PATHS.some((p) => pathname.startsWith(p));

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
          {link('/archive', 'Archive')}
          {user.role === 'admin' && (
            <div className="nav-dropdown" ref={menuRef}>
              <button
                type="button"
                className={`nav-dropdown-trigger${isAdminSectionActive ? ' active' : ''}`}
                onClick={() => setAdminOpen((o) => !o)}
              >
                Admin ▾
              </button>
              {adminOpen && (
                <div className="nav-dropdown-menu">
                  <Link href="/templates" onClick={() => setAdminOpen(false)}>Templates</Link>
                  <Link href="/stores" onClick={() => setAdminOpen(false)}>Stores</Link>
                  <Link href="/users" onClick={() => setAdminOpen(false)}>Users</Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="who">
        <span>{user.displayName} · {user.role}</span>
        <button className="ghost" onClick={signOut}>Sign out</button>
      </div>
    </div>
  );
}
