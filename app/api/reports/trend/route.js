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
  let query = admin
    .from('audits')
    .select('id, overall_score, completed_at, store_id, stores!inner(store_number, store_name, region, district_manager)')
    .eq('status', 'completed')
    .order('completed_at');

  if (region) query = query.eq('stores.region', region);
  if (districtManager) query = query.eq('stores.district_manager', districtManager);
  if (storeId) query = query.eq('store_id', storeId);
  if (dateFrom) query = query.gte('completed_at', dateFrom);
  if (dateTo) query = query.lte('completed_at', dateTo);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const avg = (arr) => (arr && arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null);

  // Month-over-month trend line.
  const byMonth = {};
  data.forEach((a) => {
    const month = a.completed_at.slice(0, 7);
    (byMonth[month] ||= []).push(a.overall_score);
  });
  const trend = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, scores]) => ({ month, averageScore: avg(scores), auditCount: scores.length }));

  // Score by district manager, across the whole filtered date range — good
  // for comparing DMs against each other at a glance.
  const byDm = {};
  data.forEach((a) => {
    const key = a.stores.district_manager;
    (byDm[key] ||= []).push(a.overall_score);
  });
  const byDistrictManager = Object.entries(byDm)
    .map(([districtManager, scores]) => ({ districtManager, averageScore: avg(scores), auditCount: scores.length }))
    .sort((a, b) => b.averageScore - a.averageScore);

  // Per-store comparison for the most recent two months present.
  const months = trend.map((t) => t.month);
  const lastMonth = months[months.length - 1];
  const prevMonth = months[months.length - 2];

  const byStore = {};
  data.forEach((a) => {
    const month = a.completed_at.slice(0, 7);
    if (month !== lastMonth && month !== prevMonth) return;
    const key = a.store_id;
    (byStore[key] ||= { storeNumber: a.stores.store_number, storeName: a.stores.store_name, districtManager: a.stores.district_manager, scores: {} });
    (byStore[key].scores[month] ||= []).push(a.overall_score);
  });

  const storeComparison = Object.values(byStore).map((s) => {
    const current = avg(s.scores[lastMonth]);
    const previous = avg(s.scores[prevMonth]);
    return {
      storeNumber: s.storeNumber,
      storeName: s.storeName,
      districtManager: s.districtManager,
      currentScore: current,
      previousScore: previous,
      change: current != null && previous != null ? Math.round((current - previous) * 10) / 10 : null,
    };
  });

  return NextResponse.json({ trend, byDistrictManager, storeComparison, lastMonth, prevMonth });
}

