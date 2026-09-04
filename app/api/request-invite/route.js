import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { name, email, message } = await request.json();
  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from('invite_requests').insert({ name, email, message: message || null });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
