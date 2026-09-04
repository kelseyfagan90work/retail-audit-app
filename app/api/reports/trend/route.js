import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const district = request.nextUrl.searchParams.get('district');
  const storeId = request.nextUrl.searchParams.get('storeId');

  const admin = createAdminClient();
  let query = admin
    .from('audits')
    .select('id, overall_score, completed_at, store_id, stores!inner(store_number, store_name, district)')
    .eq('status', 'completed')
    .order('completed_at');

  if (district) query = query.eq('stores.district', district);
  if (storeId) query = query.eq('store_id', storeId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group into calendar months for a month-over-month trend line.
  const byMonth = {};
  data.forEach((a) => {
    const month = a.completed_at.slice(0, 7); // "YYYY-MM"
    (byMonth[month] ||= []).push(a.overall_score);
  });

  const trend = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, scores]) => ({
      month,
      averageScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
      auditCount: scores.length,
    }));

  // Per-store breakdown for the most recent two months present, so you can
  // see who moved up/down since last time.
  const months = trend.map((t) => t.month);
  const lastMonth = months[months.length - 1];
  const prevMonth = months[months.length - 2];

  const byStore = {};
  data.forEach((a) => {
    const month = a.completed_at.slice(0, 7);
    if (month !== lastMonth && month !== prevMonth) return;
    const key = a.store_id;
    (byStore[key] ||= { storeNumber: a.stores.store_number, storeName: a.stores.store_name, district: a.stores.district, scores: {} });
    (byStore[key].scores[month] ||= []).push(a.overall_score);
  });

  const storeComparison = Object.values(byStore).map((s) => {
    const avg = (arr) => (arr && arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null);
    const current = avg(s.scores[lastMonth]);
    const previous = avg(s.scores[prevMonth]);
    return {
      storeNumber: s.storeNumber,
      storeName: s.storeName,
      district: s.district,
      currentScore: current,
      previousScore: previous,
      change: current != null && previous != null ? Math.round((current - previous) * 10) / 10 : null,
    };
  });

  return NextResponse.json({ trend, storeComparison, lastMonth, prevMonth });
}
