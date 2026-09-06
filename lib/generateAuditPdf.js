import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { createAdminClient } from './supabase/admin';
import AuditPdfDocument from './AuditPdfDocument';

const BUCKET = 'audit-photos';

// Returns { buffer, fileName, audit } for one audit, or throws if it can't
// be found/rendered — callers decide how to handle that (single download vs
// skipping one audit in a bulk send).
export async function generateAuditPdf(auditId, admin = createAdminClient()) {
  const { data: audit, error } = await admin
    .from('audits')
    .select('*, stores(store_number, store_name, region, district_manager)')
    .eq('id', auditId)
    .single();
  if (error) throw new Error(`Audit not found: ${error.message}`);

  const { data: sections } = await admin.from('audit_sections').select('*').eq('audit_id', auditId).order('sort_order');
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
  const buffer = await renderToBuffer(React.createElement(AuditPdfDocument, { audit: fullAudit }));

  const dateStamp = (audit.audit_period || audit.completed_at || audit.started_at).slice(0, 10);
  const fileName = `${audit.stores.store_name.replace(/[^a-z0-9]+/gi, '-')}-${dateStamp}.pdf`;

  return { buffer, fileName, audit };
}
