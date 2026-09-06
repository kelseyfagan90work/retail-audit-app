import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const excludeAuditId = request.nextUrl.searchParams.get('excludeAuditId');

  const admin = createAdminClient();
  let query = admin
    .from('audits')
    .select('id, template_name, audit_period, completed_at, overall_score')
    .eq('store_id', params.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(7);

  if (excludeAuditId) query = query.neq('id', excludeAuditId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data.slice(0, 6));
}
