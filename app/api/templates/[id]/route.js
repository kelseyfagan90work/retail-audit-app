import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const admin = createAdminClient();
  const { data: template, error } = await admin.from('audit_templates').select('*').eq('id', params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const { data: sections } = await admin
    .from('template_sections')
    .select('*')
    .eq('template_id', params.id)
    .order('sort_order');

  const { data: questions } = await admin
    .from('template_questions')
    .select('*')
    .in('section_id', (sections || []).map((s) => s.id).length ? (sections || []).map((s) => s.id) : [-1])
    .order('sort_order');

  const sectionsWithQuestions = (sections || []).map((s) => ({
    ...s,
    questions: (questions || []).filter((q) => q.section_id === s.id),
  }));

  return NextResponse.json({ ...template, sections: sectionsWithQuestions });
}

export async function PATCH(request, { params }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin access only.' }, { status: 403 });

  const body = await request.json();
  const admin = createAdminClient();
  const updates = {};
  if ('name' in body) updates.name = body.name;
  if ('description' in body) updates.description = body.description;
  if ('isActive' in body) updates.is_active = body.isActive;

  const { data, error } = await admin.from('audit_templates').update(updates).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request, { params }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin access only.' }, { status: 403 });

  const admin = createAdminClient();
  // Soft-delete: past audits reference template_id, so we deactivate rather
  // than hard-delete to avoid breaking that history.
  const { error } = await admin.from('audit_templates').update({ is_active: false }).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
