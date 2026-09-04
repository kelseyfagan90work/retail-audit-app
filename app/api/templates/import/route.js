import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin access only.' }, { status: 403 });

  const { name, description, rows } = await request.json();
  if (!name) return NextResponse.json({ error: 'name is required.' }, { status: 400 });
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows to import.' }, { status: 400 });
  }

  // Group rows into sections, preserving the order sections first appear in
  // the CSV — this becomes the section/question sort order.
  const sectionOrder = [];
  const bySections = {};
  const skipped = [];
  rows.forEach((r, i) => {
    const section = (r.section || '').toString().trim();
    const question = (r.question || '').toString().trim();
    if (!section || !question) {
      skipped.push({ row: i + 1, reason: 'Missing section or question text' });
      return;
    }
    if (!bySections[section]) {
      bySections[section] = [];
      sectionOrder.push(section);
    }
    bySections[section].push(question);
  });

  if (sectionOrder.length === 0) {
    return NextResponse.json({ error: 'No valid rows found. Every row needs a section and a question.' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: template, error: templateError } = await admin
    .from('audit_templates')
    .insert({ name, description: description || null })
    .select()
    .single();
  if (templateError) return NextResponse.json({ error: templateError.message }, { status: 500 });

  for (let i = 0; i < sectionOrder.length; i++) {
    const sectionName = sectionOrder[i];
    const { data: section, error: sectionError } = await admin
      .from('template_sections')
      .insert({ template_id: template.id, name: sectionName, sort_order: i })
      .select()
      .single();
    if (sectionError) return NextResponse.json({ error: sectionError.message }, { status: 500 });

    const questions = bySections[sectionName].map((text, j) => ({
      section_id: section.id,
      text,
      sort_order: j,
    }));
    const { error: questionsError } = await admin.from('template_questions').insert(questions);
    if (questionsError) return NextResponse.json({ error: questionsError.message }, { status: 500 });
  }

  return NextResponse.json({
    templateId: template.id,
    sectionsCreated: sectionOrder.length,
    questionsCreated: rows.length - skipped.length,
    skipped,
  });
}
