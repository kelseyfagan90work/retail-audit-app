import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { computeScore } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const admin = createAdminClient();

  const { data: sections } = await admin.from('audit_sections').select('id').eq('audit_id', params.id);
  const sectionIds = (sections || []).map((s) => s.id);
  const { data: questions } = await admin
    .from('audit_questions')
    .select('answer')
    .in('audit_section_id', sectionIds.length ? sectionIds : [-1]);

  const unanswered = (questions || []).filter((q) => !q.answer).length;
  if (unanswered > 0) {
    return NextResponse.json({ error: `${unanswered} question(s) still need an answer before completing.` }, { status: 400 });
  }

  const score = computeScore(questions || []);

  const { data, error } = await admin
    .from('audits')
    .update({ status: 'completed', completed_at: new Date().toISOString(), overall_score: score })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
