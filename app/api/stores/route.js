import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { naturalCompare } from '@/lib/sort';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin.from('stores').select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  data.sort((a, b) => naturalCompare(a.store_number, b.store_number));
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
      region: body.region || null,
      district_manager: body.districtManager,
      district_manager_email: body.districtManagerEmail || null,
      store_email: body.storeEmail || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
