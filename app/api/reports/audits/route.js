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
  let query = admin
    .from('audits')
    .select('id, overall_score, announced, manager_on_shift, auditor_name, auditor_email, template_name, started_at, completed_at, audit_period, overall_note, stores!inner(store_name, region, district_manager)')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });

  if (region) query = query.eq('stores.region', region);
  if (districtManager) query = query.eq('stores.district_manager', districtManager);
  if (storeId) query = query.eq('store_id', storeId);
  if (templateId) query = query.eq('template_id', templateId);
  if (auditorEmail) query = query.eq('auditor_email', auditorEmail);

  const { data: allData, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const data = allData.filter((a) => {
    const month = (a.audit_period || a.completed_at).slice(0, 7);
    if (dateFrom && month < dateFrom.slice(0, 7)) return false;
    if (dateTo && month > dateTo.slice(0, 7)) return false;
    return true;
  });

  const audits = data.map((a) => ({
    auditId: a.id,
    storeName: a.stores.store_name,
    region: a.stores.region,
    districtManager: a.stores.district_manager,
    templateName: a.template_name,
    auditorName: a.auditor_name,
    score: a.overall_score,
    announced: a.announced,
    managerOnShift: a.manager_on_shift,
    auditPeriod: a.audit_period,
    startedAt: a.started_at,
    completedAt: a.completed_at,
    overallNote: a.overall_note,
  }));

  return NextResponse.json({ audits });
}
