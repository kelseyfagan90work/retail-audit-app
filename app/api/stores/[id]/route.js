import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin access only.' }, { status: 403 });

  const body = await request.json();
  const admin = createAdminClient();
  const updates = {};
  if ('storeNumber' in body) updates.store_number = body.storeNumber;
  if ('storeName' in body) updates.store_name = body.storeName;
  if ('region' in body) updates.region = body.region;
  if ('districtManager' in body) updates.district_manager = body.districtManager;
  if ('storeEmail' in body) updates.store_email = body.storeEmail;
  if ('districtManagerEmail' in body) updates.district_manager_email = body.districtManagerEmail;
  if ('isActive' in body) updates.is_active = body.isActive;

  const { data, error } = await admin.from('stores').update(updates).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
