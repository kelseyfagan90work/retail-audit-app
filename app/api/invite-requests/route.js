import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin access only.' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('invite_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
