import { NextResponse } from 'next/server';
import { getSessionAndProfile } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST() {
  const { authUser } = await getSessionAndProfile();
  if (!authUser) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const admin = createAdminClient();
  const { error } = await admin.from('profiles').update({ password_set: true }).eq('id', authUser.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
