import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const admin = createAdminClient();
  const { data: task } = await admin.from('tasks').select('assigned_to_email').eq('id', params.id).maybeSingle();
  if (!task) return NextResponse.json({ error: 'Task not found.' }, { status: 404 });

  const isOwner = task.assigned_to_email === user.email;
  if (!isOwner && user.role !== 'admin') {
    return NextResponse.json({ error: 'You can only update your own tasks.' }, { status: 403 });
  }

  const body = await request.json();
  const updates = {};

  // Anyone assigned a task can toggle its status; only an admin can reassign/edit it.
  if ('status' in body) {
    updates.status = body.status;
    updates.completed_at = body.status === 'done' ? new Date().toISOString() : null;
  }
  if (user.role === 'admin') {
    if ('title' in body) updates.title = body.title;
    if ('description' in body) updates.description = body.description;
    if ('assignedToEmail' in body) updates.assigned_to_email = body.assignedToEmail;
    if ('dueDate' in body) updates.due_date = body.dueDate;
  }

  const { data, error } = await admin.from('tasks').update(updates).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
