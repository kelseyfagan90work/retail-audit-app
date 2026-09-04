import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildReportEmailHtml, sendReportEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const admin = createAdminClient();

  const { data: audit, error } = await admin
    .from('audits')
    .select('*, stores(store_number, store_name, region, district_manager, store_email, district_manager_email)')
    .eq('id', params.id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  if (audit.status !== 'completed') return NextResponse.json({ error: 'Complete the audit before sending a report.' }, { status: 400 });

  const recipients = [audit.stores.store_email, audit.stores.district_manager_email].filter(Boolean);
  if (recipients.length === 0) {
    return NextResponse.json({ error: 'This store has no store email or district manager email on file.' }, { status: 400 });
  }

  const { data: sections } = await admin.from('audit_sections').select('id, name, sort_order').eq('audit_id', params.id).order('sort_order');
  const sectionIds = (sections || []).map((s) => s.id);
  const { data: questions } = await admin
    .from('audit_questions')
    .select('*')
    .in('audit_section_id', sectionIds.length ? sectionIds : [-1]);

  const sectionsWithQuestions = (sections || []).map((s) => ({
    ...s,
    questions: (questions || []).filter((q) => q.audit_section_id === s.id),
  }));

  const html = buildReportEmailHtml({ store: audit.stores, audit, sections: sectionsWithQuestions });

  try {
    await sendReportEmail({
      to: recipients,
      subject: `Store Audit Report — ${audit.stores.store_name} (${audit.overall_score}%)`,
      html,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  await admin.from('audits').update({ report_sent_at: new Date().toISOString() }).eq('id', params.id);
  return NextResponse.json({ success: true, sentTo: recipients });
}
