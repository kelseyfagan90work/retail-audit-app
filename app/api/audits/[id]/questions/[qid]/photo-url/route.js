import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
const BUCKET = 'audit-photos';

export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const { fileName } = await request.json();
  if (!fileName) return NextResponse.json({ error: 'fileName is required.' }, { status: 400 });

  const admin = createAdminClient();
  const storagePath = `${params.id}/${params.qid}/${Date.now()}-${fileName}`;

  const { data: signed, error: signError } = await admin.storage.from(BUCKET).createSignedUploadUrl(storagePath);
  if (signError) return NextResponse.json({ error: signError.message }, { status: 500 });

  const { data: photo, error: photoError } = await admin
    .from('audit_photos')
    .insert({ audit_question_id: params.qid, storage_path: storagePath })
    .select()
    .single();
  if (photoError) return NextResponse.json({ error: photoError.message }, { status: 500 });

  return NextResponse.json({
    photoId: photo.id,
    storagePath,
    signedUrl: signed.signedUrl,
    token: signed.token,
    url: admin.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl,
  });
}
