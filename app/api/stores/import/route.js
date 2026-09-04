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
    const storeName = (r.storeName || '').toString().trim();
    const districtManager = (r.districtManager || '').toString().trim();
    if (!storeName || !districtManager) {
      skipped.push({ row: i + 1, reason: 'Missing store name or district manager' });
      return;
    }
    cleaned.push({
      store_name: storeName,
      region: (r.region || '').toString().trim() || null,
      district_manager: districtManager,
      district_manager_email: (r.districtManagerEmail || '').toString().trim() || null,
      store_email: (r.storeEmail || '').toString().trim() || null,
      is_active: true,
    });
  });

  if (cleaned.length === 0) {
    return NextResponse.json({ error: 'No valid rows found. Check that every row has a store name and district manager.' }, { status: 400 });
  }

  const admin = createAdminClient();
  // Upsert on store_name (the real identifier now): re-uploading the same
  // CSV later updates existing stores instead of creating duplicates.
  const { data, error } = await admin.from('stores').upsert(cleaned, { onConflict: 'store_name' }).select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Backfill store_number for any brand-new rows that don't have one yet.
  const needsNumber = data.filter((s) => !s.store_number);
  await Promise.all(needsNumber.map((s) => admin.from('stores').update({ store_number: String(s.id) }).eq('id', s.id)));

  return NextResponse.json({ imported: data.length, skipped });
}
