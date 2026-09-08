import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateAuditPdf } from '@/lib/generateAuditPdf';
import { buildEmailSubject, buildReportEmailHtml, sendReportEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const admin = createAdminClient();

  const { data: storeCheck, error: storeCheckError } = await admin
    .from('audits')
    .select('status, stores(store_email, district_manager_email)')
    .eq('id', params.id)
    .single();
  if (storeCheckError) return NextResponse.json({ error: storeCheckError.message }, { status: 404 });
  if (storeCheck.status !== 'completed') return NextResponse.json({ error: 'Complete the audit before sending a report.' }, { status: 400 });

  const recipients = [storeCheck.stores.store_email, storeCheck.stores.district_manager_email].filter(Boolean);
  if (recipients.length === 0) {
    return NextResponse.json({ error: 'This store has no store email or district manager email on file.' }, { status: 400 });
  }

  let buffer, fileName, audit, sections;
  try {
    ({ buffer, fileName, audit, sections } = await generateAuditPdf(params.id, admin, { hideAuditor: true }));
  } catch (e) {
    return NextResponse.json({ error: `Could not generate PDF: ${e.message}` }, { status: 500 });
  }

  const html = buildReportEmailHtml({ store: audit.stores, audit, sections });
  const subject = buildEmailSubject({
    storeName: audit.stores.store_name,
    templateName: audit.template_name,
    auditPeriod: audit.audit_period,
    completedAt: audit.completed_at,
  });

  try {
    await sendReportEmail({
      to: recipients,
      subject,
      html,
      attachments: [{ filename: fileName, content: buffer }],
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  await admin.from('audits').update({ report_sent_at: new Date().toISOString() }).eq('id', params.id);
  return NextResponse.json({ success: true, sentTo: recipients });
}
