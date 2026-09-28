import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { createAdminClient } from './supabase/admin';
import AuditPdfDocument from './AuditPdfDocument';

const BUCKET = 'audit-photos';

// Returns { buffer, fileName, audit, sections } for one audit, or throws if
// it can't be found/rendered — callers decide how to handle that (single
// download vs skipping one audit in a bulk send). `sections` includes every
// question's note, photos, and prevAnswers (that question's Yes/No/N/A from
// the two prior completed audits of the same store+template, most recent
// first — null if there aren't that many prior audits yet). `audit` also
// carries `priorPeriods`, the audit_period of those same two prior audits,
// so callers can label the trend columns with real months.
export async function generateAuditPdf(auditId, admin = createAdminClient(), { hideAuditor = true } = {}) {
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

  // Two most recent prior completed audits of this same store + template,
  // matched by question TEXT (templates are snapshotted per-audit, so this
  // is the only stable way to line up "the same criterion" across months —
  // if a question's wording is ever edited, its trend effectively resets).
  const priorAnswersByOffset = [{}, {}]; // [1 month ago, 2 months ago]
  const priorPeriods = [null, null];
  const priorScores = [null, null];
  if (audit.audit_period && audit.store_id && audit.template_id) {
    const { data: priorAudits } = await admin
      .from('audits')
      .select('id, audit_period, overall_score')
      .eq('store_id', audit.store_id)
      .eq('template_id', audit.template_id)
      .eq('status', 'completed')
      .neq('id', auditId)
      .lt('audit_period', audit.audit_period)
      .order('audit_period', { ascending: false })
      .limit(2);

    if (priorAudits && priorAudits.length > 0) {
      const priorAuditIds = priorAudits.map((a) => a.id);
      const { data: priorSections } = await admin
        .from('audit_sections')
        .select('id, audit_id')
        .in('audit_id', priorAuditIds);
      const priorSectionIds = (priorSections || []).map((s) => s.id);
      const { data: priorQuestions } = await admin
        .from('audit_questions')
        .select('text, answer, audit_section_id')
        .in('audit_section_id', priorSectionIds.length ? priorSectionIds : [-1]);

      const auditIdBySectionId = {};
      (priorSections || []).forEach((s) => { auditIdBySectionId[s.id] = s.audit_id; });

      const answersByAuditId = {};
      (priorQuestions || []).forEach((q) => {
        const aid = auditIdBySectionId[q.audit_section_id];
        (answersByAuditId[aid] ||= {})[q.text] = q.answer;
      });

      priorAudits.forEach((pa, i) => {
        priorAnswersByOffset[i] = answersByAuditId[pa.id] || {};
        priorPeriods[i] = pa.audit_period;
        priorScores[i] = pa.overall_score;
      });
    }
  }
  audit.priorPeriods = priorPeriods; // carried on `audit` so both the PDF and the email can read it without a new param
  audit.priorScores = priorScores;

  const sectionsWithQuestions = (sections || []).map((s) => ({
    ...s,
    questions: (questions || [])
      .filter((q) => q.audit_section_id === s.id)
      .map((q) => ({
        ...q,
        photos: photosWithUrls.filter((p) => p.audit_question_id === q.id),
        prevAnswers: [
          priorAnswersByOffset[0][q.text] ?? null,
          priorAnswersByOffset[1][q.text] ?? null,
        ],
      })),
  }));

  const fullAudit = { ...audit, sections: sectionsWithQuestions };
  const buffer = await renderToBuffer(React.createElement(AuditPdfDocument, { audit: fullAudit, hideAuditor }));

  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const sanitize = (s) => s.replace(/[\\/:*?"<>|]/g, '').trim();
  const [fileYear, fileMonth] = (audit.audit_period || audit.completed_at || audit.started_at).slice(0, 7).split('-');
  const monthYearLabel = `${MONTH_NAMES[parseInt(fileMonth, 10) - 1]} ${fileYear}`;
  const fileName = `${sanitize(audit.stores.store_name)} - ${sanitize(audit.template_name)} - ${monthYearLabel}.pdf`;

  return { buffer, fileName, audit, sections: sectionsWithQuestions };
}
