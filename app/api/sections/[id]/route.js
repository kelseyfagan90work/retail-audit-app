import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin access only.' }, { status: 403 });

  const body = await request.json();
  const admin = createAdminClient();
  const updates = {};
  if ('name' in body) updates.name = body.name;
  if ('sortOrder' in body) updates.sort_order = body.sortOrder;

  const { data, error } = await admin.from('template_sections').update(updates).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request, { params }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin access only.' }, { status: 403 });

  const admin = createAdminClient();
  // Hard-delete is fine here since template_sections only feeds NEW audits —
  // existing audits already snapshotted their own copy into audit_sections.
  const { error } = await admin.from('template_sections').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
