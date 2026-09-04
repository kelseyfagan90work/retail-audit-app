import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();

  const { data: audit } = await admin.from('audits').select('status').eq('id', params.id).single();
  if (audit?.status === 'completed') {
    return NextResponse.json({ error: 'This audit is already completed and can no longer be edited.' }, { status: 409 });
  }

  const updates = {};
  if ('answer' in body) updates.answer = body.answer; // 'yes' | 'no' | 'n_a' | null
  if ('note' in body) updates.note = body.note;

  const { data, error } = await admin
    .from('audit_questions')
    .update(updates)
    .eq('id', params.qid)
    .eq('audit_id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
