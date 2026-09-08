import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const threshold = Number(params.get('threshold') || 80);
  const month = params.get('month'); // 'YYYY-MM', defaults to current month on the client
  const storeId = params.get('storeId');
  const auditorEmail = params.get('auditorEmail');

  const admin = createAdminClient();

  let belowQuery = admin
    .from('audits')
    .select('id, store_id, template_name, overall_score, audit_period, completed_at, auditor_name, auditor_email, stores!inner(store_name, is_active)')
    .eq('status', 'completed')
    .lt('overall_score', threshold)
    .eq('stores.is_active', true);
  if (storeId) belowQuery = belowQuery.eq('store_id', storeId);
  if (auditorEmail) belowQuery = belowQuery.eq('auditor_email', auditorEmail);

  const { data: belowRaw } = await belowQuery;

  const belowThreshold = (belowRaw || [])
    .filter((a) => {
      if (!month) return true;
      const effectiveMonth = (a.audit_period || a.completed_at).slice(0, 7);
      return effectiveMonth === month;
    })
    .map((a) => ({
      storeId: a.store_id,
      storeName: a.stores.store_name,
      templateName: a.template_name,
      score: a.overall_score,
      completedAt: a.completed_at,
      auditId: a.id,
      auditorName: a.auditor_name,
    }))
    .sort((a, b) => a.score - b.score);

  let inProgressQuery = admin
    .from('audits')
    .select('id, started_at, auditor_email, auditor_name, template_name, store_id, stores(store_name)')
    .eq('status', 'in_progress')
    .order('started_at');
  if (storeId) inProgressQuery = inProgressQuery.eq('store_id', storeId);
  if (auditorEmail) inProgressQuery = inProgressQuery.eq('auditor_email', auditorEmail);
  const { data: inProgress } = await inProgressQuery;

  const outstandingAudits = (inProgress || []).map((a) => ({
    auditId: a.id,
    storeName: a.stores.store_name,
    templateName: a.template_name,
    auditorName: a.auditor_name,
    startedAt: a.started_at,
    daysOpen: Math.floor((Date.now() - new Date(a.started_at).getTime()) / (24 * 60 * 60 * 1000)),
  }));

  return NextResponse.json({ belowThreshold, outstandingAudits });
}
