import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const admin = createAdminClient();
  let query = admin
    .from('tasks')
    .select('*, stores(store_number, store_name)')
    .order('status', { ascending: true }) // 'done' sorts after 'open' alphabetically — good default
    .order('due_date', { ascending: true, nullsFirst: false });

  // Admins see everything (so they can track what they've assigned);
  // everyone else only sees their own tasks.
  if (user.role !== 'admin') query = query.eq('assigned_to_email', user.email);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin access only.' }, { status: 403 });

  const body = await request.json();
  if (!body.title || !body.assignedToEmail) {
    return NextResponse.json({ error: 'title and assignedToEmail are required.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('tasks')
    .insert({
      title: body.title,
      description: body.description || null,
      store_id: body.storeId || null,
      audit_id: body.auditId || null,
      assigned_to_email: body.assignedToEmail,
      assigned_by_email: user.email,
      due_date: body.dueDate || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
