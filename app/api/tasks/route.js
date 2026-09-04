import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const storeId = params.get('storeId');
  const assignedToEmail = params.get('assignedToEmail');

  const admin = createAdminClient();
  let query = admin
    .from('tasks')
    .select('*, stores(store_number, store_name)')
    .order('status', { ascending: true }) // 'done' sorts after 'open' alphabetically — good default
    .order('due_date', { ascending: true, nullsFirst: false });

  // Admins see everything by default (so they can track what they've
  // assigned) and can narrow with filters; everyone else only ever sees
  // their own tasks regardless of filters passed.
  if (user.role !== 'admin') {
    query = query.eq('assigned_to_email', user.email);
  } else {
    if (storeId) query = query.eq('store_id', storeId);
    if (assignedToEmail) query = query.eq('assigned_to_email', assignedToEmail);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = await request.json();
  if (!body.title || !body.assignedToEmail) {
    return NextResponse.json({ error: 'title and assignedToEmail are required.' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Admins can assign anything to anyone. A non-admin can only create a
  // task tied to an audit they themselves conducted — e.g. flagging a
  // criteria miss from inside their own audit for follow-up.
  if (user.role !== 'admin') {
    if (!body.auditId) return NextResponse.json({ error: 'Only admins can create tasks not tied to one of your own audits.' }, { status: 403 });
    const { data: audit } = await admin.from('audits').select('auditor_email, store_id').eq('id', body.auditId).maybeSingle();
    if (!audit || audit.auditor_email !== user.email) {
      return NextResponse.json({ error: 'You can only create tasks from audits you conducted.' }, { status: 403 });
    }
  }

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
