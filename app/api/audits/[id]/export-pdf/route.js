import { NextResponse } from 'next/server';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import AuditPdfDocument from '@/lib/AuditPdfDocument';

export const dynamic = 'force-dynamic';
const BUCKET = 'audit-photos';

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const admin = createAdminClient();

  const { data: audit, error } = await admin
    .from('audits')
    .select('*, stores(store_number, store_name, region, district_manager)')
    .eq('id', params.id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const { data: sections } = await admin.from('audit_sections').select('*').eq('audit_id', params.id).order('sort_order');
  const sectionIds = (sections || []).map((s) => s.id);
  const { data: questions } = await admin
    .from('audit_questions')
    .select('*')
    .in('audit_section_id', sectionIds.length ? sectionIds : [-1])
    .order('sort_order');
  const questionIds = (questions || []).map((q) => q.id);
  const { data: photos } = await admin
    .from('audit_photos')
    .select('*')
    .in('audit_question_id', questionIds.length ? questionIds : [-1]);

  const photosWithUrls = (photos || []).map((p) => ({
    ...p,
    url: admin.storage.from(BUCKET).getPublicUrl(p.storage_path).data.publicUrl,
  }));

  const sectionsWithQuestions = (sections || []).map((s) => ({
    ...s,
    questions: (questions || [])
      .filter((q) => q.audit_section_id === s.id)
      .map((q) => ({ ...q, photos: photosWithUrls.filter((p) => p.audit_question_id === q.id) })),
  }));

  const fullAudit = { ...audit, sections: sectionsWithQuestions };

  let buffer;
  try {
    buffer = await renderToBuffer(React.createElement(AuditPdfDocument, { audit: fullAudit }));
  } catch (e) {
    return NextResponse.json({ error: `Could not generate PDF: ${e.message}` }, { status: 500 });
  }

  const dateStamp = (audit.audit_period || audit.completed_at || audit.started_at).slice(0, 10);
  const fileName = `${audit.stores.store_name.replace(/[^a-z0-9]+/gi, '-')}-${dateStamp}.pdf`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}
