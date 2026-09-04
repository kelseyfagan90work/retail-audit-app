import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin access only.' }, { status: 403 });

  const body = await request.json();
  const updates = {};
  if ('displayName' in body) updates.display_name = body.displayName;
  if ('role' in body) {
    if (!['admin', 'auditor'].includes(body.role)) {
      return NextResponse.json({ error: "role must be 'admin' or 'auditor'." }, { status: 400 });
    }
    updates.role = body.role;
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from('profiles').update(updates).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
