import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin.from('stores').select('*').order('store_number');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin access only.' }, { status: 403 });

  const body = await request.json();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('stores')
    .insert({
      store_number: body.storeNumber,
      store_name: body.storeName,
      district: body.district,
      store_manager_name: body.storeManagerName || null,
      store_manager_email: body.storeManagerEmail || null,
      district_manager_email: body.districtManagerEmail || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
