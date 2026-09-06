import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const month = params.get('month'); // 'YYYY-MM'
  const storeId = params.get('storeId');
  if (!month) return NextResponse.json({ error: 'month is required.' }, { status: 400 });

  const admin = createAdminClient();

  const { data: templates } = await admin.from('audit_templates').select('id, name').eq('is_active', true);

  let storesQuery = admin.from('stores').select('id, store_name').eq('is_active', true);
  if (storeId) storesQuery = storesQuery.eq('id', storeId);
  const { data: stores } = await storesQuery;

  const monthStart = `${month}-01`;
  const nextMonth = new Date(monthStart);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const monthEnd = nextMonth.toISOString().slice(0, 10);

  const { data: audits } = await admin
    .from('audits')
    .select('id, store_id, template_id, status')
    .gte('audit_period', monthStart)
    .lt('audit_period', monthEnd);

  // For each store+template, the most useful existing audit is a completed
  // one (nothing to do) or, failing that, an in-progress one (so clicking
  // through continues it rather than starting a duplicate).
  const auditByKey = {};
  (audits || []).forEach((a) => {
    const key = `${a.store_id}::${a.template_id}`;
    if (a.status === 'completed') auditByKey[key] = a;
    else if (!auditByKey[key]) auditByKey[key] = a;
  });

  const result = (templates || []).map((t) => {
    const missingStores = (stores || [])
      .filter((s) => {
        const existing = auditByKey[`${s.id}::${t.id}`];
        return !existing || existing.status !== 'completed';
      })
      .map((s) => {
        const existing = auditByKey[`${s.id}::${t.id}`];
        return {
          storeId: s.id,
          storeName: s.store_name,
          existingAuditId: existing ? existing.id : null,
        };
      })
      .sort((a, b) => a.storeName.localeCompare(b.storeName));

    return { templateId: t.id, templateName: t.name, missingCount: missingStores.length, stores: missingStores };
  });

  result.sort((a, b) => b.missingCount - a.missingCount || a.templateName.localeCompare(b.templateName));

  return NextResponse.json({ month, templates: result });
}
