import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin access only.' }, { status: 403 });

  const { status } = await request.json();
  if (!['invited', 'dismissed'].includes(status)) {
    return NextResponse.json({ error: "status must be 'invited' or 'dismissed'." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from('invite_requests').update({ status }).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
