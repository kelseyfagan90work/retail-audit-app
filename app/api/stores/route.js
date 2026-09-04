import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin.from('stores').select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  data.sort((a, b) => a.store_name.localeCompare(b.store_name));
  return NextResponse.json(data);
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin access only.' }, { status: 403 });

  const body = await request.json();
  if (!body.storeName || !body.districtManager) {
    return NextResponse.json({ error: 'Store name and district manager are required.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('stores')
    .insert({
      store_name: body.storeName,
      region: body.region || null,
      district_manager: body.districtManager,
      district_manager_email: body.districtManagerEmail || null,
      store_email: body.storeEmail || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // store_number is just a stable internal reference now, not something
  // anyone enters — assign it from the row's own id once we know it.
  const { data: updated } = await admin
    .from('stores')
    .update({ store_number: String(data.id) })
    .eq('id', data.id)
    .select()
    .single();

  return NextResponse.json(updated || data);
}
