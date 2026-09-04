import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const region = params.get('region');
  const districtManager = params.get('districtManager');
  const storeId = params.get('storeId');
  const templateId = params.get('templateId');
  const auditorEmail = params.get('auditorEmail');
  const dateFrom = params.get('dateFrom');
  const dateTo = params.get('dateTo');

  const admin = createAdminClient();
  let auditQuery = admin.from('audits').select('id, completed_at, audit_period, stores!inner(region, district_manager)').eq('status', 'completed');

  if (region) auditQuery = auditQuery.eq('stores.region', region);
  if (districtManager) auditQuery = auditQuery.eq('stores.district_manager', districtManager);
  if (storeId) auditQuery = auditQuery.eq('store_id', storeId);
  if (templateId) auditQuery = auditQuery.eq('template_id', templateId);
  if (auditorEmail) auditQuery = auditQuery.eq('auditor_email', auditorEmail);

  const { data: allAudits, error: auditsError } = await auditQuery;
  if (auditsError) return NextResponse.json({ error: auditsError.message }, { status: 500 });

  const audits = allAudits.filter((a) => {
    const month = (a.audit_period || a.completed_at).slice(0, 7);
    if (dateFrom && month < dateFrom.slice(0, 7)) return false;
    if (dateTo && month > dateTo.slice(0, 7)) return false;
    return true;
  });

  const auditIds = audits.map((a) => a.id);
  if (auditIds.length === 0) return NextResponse.json({ criteria: [] });

  const { data: sections } = await admin.from('audit_sections').select('id, name, audit_id').in('audit_id', auditIds);
  const sectionIds = (sections || []).map((s) => s.id);
  const { data: questions } = await admin
    .from('audit_questions')
    .select('text, answer, audit_section_id')
    .in('audit_section_id', sectionIds.length ? sectionIds : [-1]);

  const sectionNameById = {};
  (sections || []).forEach((s) => { sectionNameById[s.id] = s.name; });

  // Group by (section name + question text) — same question wording that
  // shows up across many audits (because templates get reused/snapshotted)
  // gets aggregated together, even though each audit has its own copy.
  const byQuestion = {};
  (questions || []).forEach((q) => {
    if (q.answer !== 'yes' && q.answer !== 'no') return; // exclude N/A and unanswered
    const key = `${sectionNameById[q.audit_section_id] || 'Unknown'}::${q.text}`;
    (byQuestion[key] ||= { section: sectionNameById[q.audit_section_id] || 'Unknown', question: q.text, fails: 0, total: 0 });
    byQuestion[key].total += 1;
    if (q.answer === 'no') byQuestion[key].fails += 1;
  });

  const criteria = Object.values(byQuestion)
    .map((c) => ({ ...c, failRate: Math.round((c.fails / c.total) * 1000) / 10 }))
    .sort((a, b) => b.fails - a.fails); // most-missed first

  return NextResponse.json({ criteria });
}
