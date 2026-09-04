import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin access only.' }, { status: 403 });

  const { email, displayName, role, redirectTo } = await request.json();
  if (!email || !displayName || !role) {
    return NextResponse.json({ error: 'email, displayName, and role are required.' }, { status: 400 });
  }
  if (!['admin', 'auditor'].includes(role)) {
    return NextResponse.json({ error: "role must be 'admin' or 'auditor'." }, { status: 400 });
  }

  const admin = createAdminClient();

  // This both creates the Supabase Auth user AND emails them a sign-in link
  // — no password to invent, no UUID to copy by hand.
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: redirectTo || undefined,
  });

  if (error) {
    // Most common case: this email already has an account. Look up its
    // existing auth user so we can still (re)create/fix the profile row.
    if (!/already/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  let authUserId = data?.user?.id;
  if (!authUserId) {
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!existing) return NextResponse.json({ error: 'Could not find or create that user.' }, { status: 500 });
    authUserId = existing.id;
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .upsert({ id: authUserId, email, display_name: displayName, role }, { onConflict: 'id' })
    .select()
    .single();

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  return NextResponse.json(profile);
}
