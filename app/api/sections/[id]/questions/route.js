import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin access only.' }, { status: 403 });

  const { text } = await request.json();
  if (!text) return NextResponse.json({ error: 'text is required.' }, { status: 400 });

  const admin = createAdminClient();
  const { count } = await admin
    .from('template_questions')
    .select('id', { count: 'exact', head: true })
    .eq('section_id', params.id);

  const { data, error } = await admin
    .from('template_questions')
    .insert({ section_id: params.id, text, sort_order: count || 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
