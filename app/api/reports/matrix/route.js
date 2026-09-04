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

  // Deliberately no templateId filter here — the whole point of this view
  // is every template as its own column, matching the scoring sheet.
  const admin = createAdminClient();
  let query = admin
    .from('audits')
    .select('overall_score, completed_at, audit_period, template_name, store_id, stores!inner(store_name, region, district_manager)')
    .eq('status', 'completed');
  if (region) query = query.eq('stores.region', region);
  if (districtManager) query = query.eq('stores.district_manager', districtManager);
  if (storeId) query = query.eq('store_id', storeId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const filtered = data.filter((a) => {
    const month = (a.audit_period || a.completed_at).slice(0, 7);
    if (dateFrom && month < dateFrom.slice(0, 7)) return false;
    if (dateTo && month > dateTo.slice(0, 7)) return false;
    return true;
  });

  const templateSet = new Set();
  const byStore = {};
  filtered.forEach((a) => {
    templateSet.add(a.template_name);
    const key = a.store_id;
    (byStore[key] ||= {
      storeName: a.stores.store_name,
      region: a.stores.region,
      districtManager: a.stores.district_manager,
      scores: {},
    });
    (byStore[key].scores[a.template_name] ||= []).push(a.overall_score);
  });

  const templates = [...templateSet].sort();
  const stores = Object.values(byStore)
    .map((s) => {
      const scores = {};
      templates.forEach((t) => {
        const arr = s.scores[t];
        // Raw fraction (0.83, not 83) so it pastes straight into
        // percentage-formatted spreadsheet cells.
        scores[t] = arr && arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) / 100 : null;
      });
      return { storeName: s.storeName, region: s.region, districtManager: s.districtManager, scores };
    })
    .sort((a, b) => a.storeName.localeCompare(b.storeName));

  return NextResponse.json({ templates, stores });
}
