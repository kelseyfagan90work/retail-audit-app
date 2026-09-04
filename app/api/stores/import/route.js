import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin access only.' }, { status: 403 });

  const { rows } = await request.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows to import.' }, { status: 400 });
  }

  const cleaned = [];
  const skipped = [];
  rows.forEach((r, i) => {
    const storeNumber = (r.storeNumber || '').toString().trim();
    const storeName = (r.storeName || '').toString().trim();
    const district = (r.district || '').toString().trim();
    if (!storeNumber || !storeName || !district) {
      skipped.push({ row: i + 1, reason: 'Missing store number, name, or district' });
      return;
    }
    cleaned.push({
      store_number: storeNumber,
      store_name: storeName,
      district,
      store_manager_name: (r.storeManagerName || '').toString().trim() || null,
      store_manager_email: (r.storeManagerEmail || '').toString().trim() || null,
      district_manager_email: (r.districtManagerEmail || '').toString().trim() || null,
      is_active: true,
    });
  });

  if (cleaned.length === 0) {
    return NextResponse.json({ error: 'No valid rows found. Check that every row has a store number, name, and district.' }, { status: 400 });
  }

  const admin = createAdminClient();
  // Upsert on store_number: re-uploading the same CSV later updates existing
  // stores instead of creating duplicates.
  const { data, error } = await admin.from('stores').upsert(cleaned, { onConflict: 'store_number' }).select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ imported: data.length, skipped });
}
