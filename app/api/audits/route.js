import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const status = request.nextUrl.searchParams.get('status');
  const admin = createAdminClient();
  let query = admin
    .from('audits')
    .select('*, stores(store_number, store_name, region, district_manager)')
    .order('started_at', { ascending: false });
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const { storeId, templateId } = await request.json();
  if (!storeId || !templateId) return NextResponse.json({ error: 'storeId and templateId are required.' }, { status: 400 });

  const admin = createAdminClient();

  const { data: template, error: templateError } = await admin
    .from('audit_templates')
    .select('*')
    .eq('id', templateId)
    .single();
  if (templateError) return NextResponse.json({ error: 'Template not found.' }, { status: 404 });

  const { data: sections } = await admin
    .from('template_sections')
    .select('*, template_questions(*)')
    .eq('template_id', templateId)
    .order('sort_order');

  const { data: audit, error: auditError } = await admin
    .from('audits')
    .insert({
      store_id: storeId,
      template_id: templateId,
      template_name: template.name,
      auditor_email: user.email,
    })
    .select()
    .single();
  if (auditError) return NextResponse.json({ error: auditError.message }, { status: 500 });

  // Snapshot the template's current sections/questions into this audit so
  // later edits to the master template never change what this audit shows.
  for (const section of sections || []) {
    const { data: auditSection, error: sectionError } = await admin
      .from('audit_sections')
      .insert({ audit_id: audit.id, name: section.name, sort_order: section.sort_order })
      .select()
      .single();
    if (sectionError) return NextResponse.json({ error: sectionError.message }, { status: 500 });

    const activeQuestions = (section.template_questions || []).filter((q) => q.is_active);
    if (activeQuestions.length > 0) {
      const { error: questionsError } = await admin.from('audit_questions').insert(
        activeQuestions.map((q) => ({
          audit_id: audit.id,
          audit_section_id: auditSection.id,
          text: q.text,
          sort_order: q.sort_order,
        }))
      );
      if (questionsError) return NextResponse.json({ error: questionsError.message }, { status: 500 });
    }
  }

  return NextResponse.json(audit);
}
