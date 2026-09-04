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
  const dateFrom = params.get('dateFrom');
  const dateTo = params.get('dateTo');

  const admin = createAdminClient();
  let auditQuery = admin
    .from('audits')
    .select('id, stores!inner(region, district_manager)')
    .eq('status', 'completed');

  if (region) auditQuery = auditQuery.eq('stores.region', region);
  if (districtManager) auditQuery = auditQuery.eq('stores.district_manager', districtManager);
  if (storeId) auditQuery = auditQuery.eq('store_id', storeId);
  if (dateFrom) auditQuery = auditQuery.gte('completed_at', dateFrom);
  if (dateTo) auditQuery = auditQuery.lte('completed_at', dateTo);

  const { data: audits, error: auditsError } = await auditQuery;
  if (auditsError) return NextResponse.json({ error: auditsError.message }, { status: 500 });

  const auditIds = audits.map((a) => a.id);
  if (auditIds.length === 0) return NextResponse.json({ sections: [] });

  const { data: sections } = await admin.from('audit_sections').select('id, name, audit_id').in('audit_id', auditIds);
  const sectionIds = (sections || []).map((s) => s.id);
  const { data: questions } = await admin
    .from('audit_questions')
    .select('answer, audit_section_id')
    .in('audit_section_id', sectionIds.length ? sectionIds : [-1]);

  const sectionNameById = {};
  (sections || []).forEach((s) => { sectionNameById[s.id] = s.name; });

  // Group by section NAME (not id — each audit has its own snapshot copy of
  // the section, so "Front of Store" from one audit and another are
  // different rows but the same conceptual category).
  const byName = {};
  (questions || []).forEach((q) => {
    if (q.answer !== 'yes' && q.answer !== 'no') return; // exclude N/A and unanswered, same as overall scoring
    const name = sectionNameById[q.audit_section_id];
    if (!name) return;
    (byName[name] ||= { yes: 0, total: 0 });
    byName[name].total += 1;
    if (q.answer === 'yes') byName[name].yes += 1;
  });

  const result = Object.entries(byName)
    .map(([name, { yes, total }]) => ({ section: name, passRate: Math.round((yes / total) * 1000) / 10, sampleSize: total }))
    .sort((a, b) => a.passRate - b.passRate); // weakest first

  return NextResponse.json({ sections: result });
}
