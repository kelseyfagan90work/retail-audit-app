import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
const BUCKET = 'audit-photos';

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const admin = createAdminClient();

  const { data: audit, error } = await admin
    .from('audits')
    .select('*, stores(store_number, store_name, region, district_manager, store_email, district_manager_email)')
    .eq('id', params.id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const { data: sections } = await admin
    .from('audit_sections')
    .select('*')
    .eq('audit_id', params.id)
    .order('sort_order');

  const sectionIds = (sections || []).map((s) => s.id);
  const { data: questions } = await admin
    .from('audit_questions')
    .select('*')
    .in('audit_section_id', sectionIds.length ? sectionIds : [-1])
    .order('sort_order');

  const questionIds = (questions || []).map((q) => q.id);
  const { data: photos } = await admin
    .from('audit_photos')
    .select('*')
    .in('audit_question_id', questionIds.length ? questionIds : [-1]);

  const photosWithUrls = (photos || []).map((p) => ({
    ...p,
    url: admin.storage.from(BUCKET).getPublicUrl(p.storage_path).data.publicUrl,
  }));

  const sectionsWithQuestions = (sections || []).map((s) => ({
    ...s,
    questions: (questions || [])
      .filter((q) => q.audit_section_id === s.id)
      .map((q) => ({ ...q, photos: photosWithUrls.filter((p) => p.audit_question_id === q.id) })),
  }));

  return NextResponse.json({ ...audit, sections: sectionsWithQuestions });
}

export async function PATCH(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();
  const updates = {};

  // Anyone working the audit can set these, any time.
  if ('overallNote' in body) updates.overall_note = body.overallNote;
  if ('announced' in body) updates.announced = body.announced;
  if ('managerOnShift' in body) updates.manager_on_shift = body.managerOnShift;

  // Reopening a completed audit for editing (e.g. a store appeal) is
  // admin-only — it unlocks question editing again by flipping status back
  // to in_progress; re-completing recomputes the score and completed_at.
  if ('status' in body) {
    if (user.role !== 'admin') return NextResponse.json({ error: 'Only an admin can reopen a completed audit.' }, { status: 403 });
    if (body.status !== 'in_progress') return NextResponse.json({ error: "Can only reopen to 'in_progress'." }, { status: 400 });
    updates.status = 'in_progress';
  }

  const { data, error } = await admin.from('audits').update(updates).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const admin = createAdminClient();
  const { data: audit } = await admin.from('audits').select('auditor_email, status').eq('id', params.id).maybeSingle();
  if (!audit) return NextResponse.json({ error: 'Audit not found.' }, { status: 404 });

  // Admins can discard any audit. The auditor who started it can only
  // discard it while still in progress, to avoid accidentally losing a
  // finalized record without admin sign-off.
  const canDiscard = user.role === 'admin' || (audit.auditor_email === user.email && audit.status === 'in_progress');
  if (!canDiscard) return NextResponse.json({ error: 'You do not have permission to discard this audit.' }, { status: 403 });

  // Sections/questions/photos all cascade-delete via their foreign keys.
  const { error } = await admin.from('audits').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
