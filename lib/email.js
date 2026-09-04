import { Resend } from 'resend';

export function buildReportEmailHtml({ store, audit, sections }) {
  const failedItems = [];
  sections.forEach((s) => {
    s.questions.forEach((q) => {
      if (q.answer === 'no') failedItems.push({ section: s.name, text: q.text, note: q.note });
    });
  });

  const scoreColor = audit.overall_score >= 90 ? '#1d7a3c' : audit.overall_score >= 75 ? '#b8860f' : '#b23a34';

  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #1c2430; max-width: 560px; margin: 0 auto;">
    <h2 style="margin-bottom: 4px;">Store Audit Report</h2>
    <p style="color: #57616e; margin-top: 0;">${store.store_name} — ${new Date(audit.completed_at).toLocaleDateString()}</p>
    <div style="background: #f6f5f2; border-radius: 10px; padding: 16px 20px; margin: 16px 0;">
      <div style="font-size: 13px; color: #57616e; text-transform: uppercase; letter-spacing: 0.03em;">Overall score</div>
      <div style="font-size: 32px; font-weight: 700; color: ${scoreColor};">${audit.overall_score}%</div>
    </div>
    ${
      failedItems.length > 0
        ? `<h3 style="margin-bottom: 8px;">Items needing attention</h3>
           <ul style="padding-left: 18px;">
             ${failedItems.map((i) => `<li style="margin-bottom: 8px;"><strong>${i.section}:</strong> ${i.text}${i.note ? `<br/><span style="color:#57616e; font-size: 13px;">Note: ${i.note}</span>` : ''}</li>`).join('')}
           </ul>`
        : `<p style="color: #1d7a3c;">No items were marked as failing on this audit. Nice work!</p>`
    }
    <p style="color: #57616e; font-size: 13px; margin-top: 24px;">Audited by ${audit.auditor_email}</p>
  </div>`;
}

export async function sendReportEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set — add it to your environment variables to enable emailing reports.');
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.REPORT_FROM_EMAIL || 'onboarding@resend.dev',
    to,
    subject,
    html,
  });
  if (error) throw new Error(error.message || 'Failed to send email.');
}
