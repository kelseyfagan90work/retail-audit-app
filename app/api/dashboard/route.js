import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const threshold = Number(params.get('threshold') || 80);
  const storeId = params.get('storeId');
  const auditorEmail = params.get('auditorEmail');

  const admin = createAdminClient();

  let storesQuery = admin.from('stores').select('id, store_name').eq('is_active', true);
  if (storeId) storesQuery = storesQuery.eq('id', storeId);
  const { data: stores } = await storesQuery;

  const { data: completedAudits } = await admin
    .from('audits')
    .select('id, store_id, overall_score, completed_at, auditor_name, auditor_email')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });

  // Most recent completed audit per store (audits are already sorted newest
  // first, so the first time we see a store_id is its latest audit).
  const latestByStore = {};
  (completedAudits || []).forEach((a) => {
    if (!latestByStore[a.store_id]) latestByStore[a.store_id] = a;
  });

  const belowThreshold = (stores || [])
    .map((s) => ({ store: s, latest: latestByStore[s.id] }))
    .filter(({ latest }) => latest && latest.overall_score < threshold)
    .filter(({ latest }) => !auditorEmail || latest.auditor_email === auditorEmail)
    .map(({ store, latest }) => ({
      storeId: store.id,
      storeName: store.store_name,
      score: latest.overall_score,
      completedAt: latest.completed_at,
      auditId: latest.id,
      auditorName: latest.auditor_name,
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
