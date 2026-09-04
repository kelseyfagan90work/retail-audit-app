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
      <div className="links">
        {link('/audits', 'Audits')}
        {link('/reports', 'Reports')}
        {user.role === 'admin' && link('/templates', 'Templates')}
        {user.role === 'admin' && link('/stores', 'Stores')}
      </div>
      <div className="who">
        <span>{user.displayName} · {user.role}</span>
        <button className="ghost" onClick={signOut}>Sign out</button>
      </div>
    </div>
  );
}
