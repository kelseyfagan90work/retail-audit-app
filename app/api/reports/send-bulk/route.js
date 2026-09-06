import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateAuditPdf } from '@/lib/generateAuditPdf';
import { buildBulkReportEmailHtml, sendReportEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin access only.' }, { status: 403 });

  const { auditIds, to } = await request.json();
  if (!Array.isArray(auditIds) || auditIds.length === 0) {
    return NextResponse.json({ error: 'Select at least one audit.' }, { status: 400 });
  }
  if (!to) return NextResponse.json({ error: 'Recipient email is required.' }, { status: 400 });
  if (auditIds.length > 20) {
    return NextResponse.json({ error: 'Please send 20 or fewer audits at a time (email attachment size limits).' }, { status: 400 });
  }

  const admin = createAdminClient();
  const attachments = [];
  const summaries = [];

  for (const id of auditIds) {
    try {
      const { buffer, fileName, audit } = await generateAuditPdf(id, admin);
      attachments.push({ filename: fileName, content: buffer });
      summaries.push({
        storeName: audit.stores.store_name,
        templateName: audit.template_name,
        overall_score: audit.overall_score,
      });
    } catch (e) {
      return NextResponse.json({ error: `Failed generating PDF for audit ${id}: ${e.message}` }, { status: 500 });
    }
  }

  const html = buildBulkReportEmailHtml({ audits: summaries });
  const monthLabel = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  try {
    await sendReportEmail({
      to,
      subject: `Audit Reports — ${summaries.length} store${summaries.length === 1 ? '' : 's'} (${monthLabel})`,
      html,
      attachments,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, count: summaries.length, sentTo: to });
}
