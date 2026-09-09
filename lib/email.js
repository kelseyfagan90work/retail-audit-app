import { Resend } from 'resend';

// "Stiiizy - Moreno Valley - Facilities Audit Report 09/26" — no score, always
// identifies store + audit type + month so it's scannable in an inbox list.
export function buildEmailSubject({ storeName, templateName, auditPeriod }) {
  const [year, month] = auditPeriod.slice(0, 7).split('-');
  return `Stiiizy - ${storeName} - ${templateName} Audit Report ${month}/${year.slice(2)}`;
}

export function buildReportEmailHtml({ store, audit, sections }) {
  const failedItems = [];
  sections.forEach((s) => {
    s.questions.forEach((q) => {
      if (q.answer === 'no') failedItems.push({ section: s.name, text: q.text, note: q.note, photos: q.photos || [] });
    });
  });

  const scoreColor = audit.overall_score >= 90 ? '#1d7a3c' : audit.overall_score >= 75 ? '#b8860f' : '#b23a34';

  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const [auditYear, auditMonth] = audit.audit_period.slice(0, 7).split('-');
  const monthYearLabel = `${MONTH_NAMES[parseInt(auditMonth, 10) - 1]} ${auditYear}`;
  
  const photoImgs = (photos) => photos.length
    ? `<div style="margin-top: 6px;">${photos.map((p) => `<img src="${p.url}" width="120" height="120" style="object-fit: cover; border-radius: 6px; margin-right: 6px; margin-bottom: 6px;" />`).join('')}</div>`
    : '';

  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #1c2430; max-width: 560px; margin: 0 auto;">
    <h2 style="margin-bottom: 4px;">${audit.template_name} Audit Report</h2>
    <p style="color: #57616e; margin-top: 0;">${store.store_name} — ${monthYearLabel}</p>
    <div style="background: #f6f5f2; border-radius: 10px; padding: 16px 20px; margin: 16px 0;">
      <div style="font-size: 13px; color: #57616e; text-transform: uppercase; letter-spacing: 0.03em;">Overall score</div>
      <div style="font-size: 32px; font-weight: 700; color: ${scoreColor};">${audit.overall_score}%</div>
    </div>
    ${
      failedItems.length > 0
        ? `<h3 style="margin-bottom: 8px;">Items needing attention</h3>
           <ul style="padding-left: 18px;">
             ${failedItems.map((i) => `<li style="margin-bottom: 12px;"><strong>${i.section}:</strong> ${i.text}${i.note ? `<br/><span style="color:#57616e; font-size: 13px;">Note: ${i.note}</span>` : ''}${photoImgs(i.photos)}</li>`).join('')}
           </ul>
           <p style="color: #57616e; font-size: 13px;">The full report, including every question and answer, is attached as a PDF.</p>`
        : `<p style="color: #1d7a3c;">No items were marked as failing on this audit. Nice work! The full report is attached as a PDF.</p>`
    }
  </div>`;
}

export async function sendReportEmail({ to, cc, subject, html, attachments }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set — add it to your environment variables to enable emailing reports.');
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromAddress = process.env.REPORT_FROM_EMAIL || 'noreply@radaraudit.space';
  const { error } = await resend.emails.send({
    from: `Retail Auditing Dept <${fromAddress}>`,
    to,
    ...(cc && cc.length ? { cc } : {}),
    subject,
    html,
    ...(attachments ? { attachments } : {}),
  });
  if (error) throw new Error(error.message || 'Failed to send email.');
}

// Summary email body for a bulk send of several audit PDFs at once.
export function buildBulkReportEmailHtml({ audits }) {
  const rows = audits
    .map((a) => {
      const scoreColor = a.overall_score >= 90 ? '#1d7a3c' : a.overall_score >= 75 ? '#b8860f' : '#b23a34';
      return `<tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e4e4e7;">${a.storeName}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e4e4e7;">${a.templateName}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e4e4e7; color: ${scoreColor}; font-weight: 700;">${a.overall_score}%</td>
      </tr>`;
    })
    .join('');

  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #1c2430; max-width: 560px; margin: 0 auto;">
    <h2 style="margin-bottom: 4px;">Audit Reports</h2>
    <p style="color: #57616e; margin-top: 0;">${audits.length} audit report${audits.length === 1 ? '' : 's'} attached as PDFs.</p>
    <table style="border-collapse: collapse; width: 100%; margin-top: 12px;">
      <thead>
        <tr>
          <th style="text-align:left; padding: 8px 12px; font-size: 12px; color: #71717a; text-transform: uppercase;">Store</th>
          <th style="text-align:left; padding: 8px 12px; font-size: 12px; color: #71717a; text-transform: uppercase;">Audit Type</th>
          <th style="text-align:left; padding: 8px 12px; font-size: 12px; color: #71717a; text-transform: uppercase;">Score</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}
