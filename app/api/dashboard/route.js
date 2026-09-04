import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const threshold = Number(params.get('threshold') || 80);
  const overdueDays = Number(params.get('overdueDays') || 30);

  const admin = createAdminClient();

  const { data: stores } = await admin
    .from('stores')
    .select('id, store_number, store_name, region, district_manager')
    .eq('is_active', true);

  const { data: completedAudits } = await admin
    .from('audits')
    .select('id, store_id, overall_score, completed_at')
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
    .map(({ store, latest }) => ({
      storeId: store.id,
      storeNumber: store.store_number,
      storeName: store.store_name,
      region: store.region,
      districtManager: store.district_manager,
      score: latest.overall_score,
      completedAt: latest.completed_at,
      auditId: latest.id,
    }))
    .sort((a, b) => a.score - b.score);

  const overdueCutoff = new Date(Date.now() - overdueDays * 24 * 60 * 60 * 1000);
  const overdueStores = (stores || [])
    .map((s) => ({ store: s, latest: latestByStore[s.id] }))
    .filter(({ latest }) => !latest || new Date(latest.completed_at) < overdueCutoff)
    .map(({ store, latest }) => ({
      storeId: store.id,
      storeNumber: store.store_number,
      storeName: store.store_name,
      region: store.region,
      districtManager: store.district_manager,
      lastAuditDate: latest ? latest.completed_at : null,
      neverAudited: !latest,
    }))
    .sort((a, b) => (a.lastAuditDate || '').localeCompare(b.lastAuditDate || ''));

  const { data: inProgress } = await admin
    .from('audits')
    .select('id, started_at, auditor_email, template_name, stores(store_number, store_name)')
    .eq('status', 'in_progress')
    .order('started_at');

  const outstandingAudits = (inProgress || []).map((a) => ({
    auditId: a.id,
    storeNumber: a.stores.store_number,
    storeName: a.stores.store_name,
    templateName: a.template_name,
    auditorEmail: a.auditor_email,
    startedAt: a.started_at,
    daysOpen: Math.floor((Date.now() - new Date(a.started_at).getTime()) / (24 * 60 * 60 * 1000)),
  }));

  return NextResponse.json({ belowThreshold, overdueStores, outstandingAudits });
}
