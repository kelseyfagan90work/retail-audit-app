'use client';

import { useEffect, useRef, useState } from 'react';
import AppFrame from '@/components/AppFrame';
import { api, uploadToStorage } from '@/lib/api';
import { compressImage } from '@/lib/compressImage';
import AnswerToggle from '@/components/AnswerToggle';
import ScoreRing from '@/components/ScoreRing';

function QuestionRow({ question, auditId, readOnly, onChanged }) {
  const [note, setNote] = useState(question.note || '');
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef(null);

  async function setAnswer(answer) {
    await api.updateAuditQuestion(auditId, question.id, { answer });
    onChanged();
  }

  async function saveNote() {
    if (note === (question.note || '')) return;
    await api.updateAuditQuestion(auditId, question.id, { note });
  }

  async function handleFiles(fileList) {
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const compressed = await compressImage(file);
        const { storagePath, token } = await api.getPhotoUploadUrl(auditId, question.id, compressed.name);
        await uploadToStorage(storagePath, token, compressed);
      }
      onChanged();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="audit-question">
      <div className="audit-question-row">
        <div className="audit-question-text">{question.text}</div>
        <AnswerToggle value={question.answer} onChange={setAnswer} disabled={readOnly} />
      </div>

      {!readOnly && (
        <textarea
          placeholder="Optional note..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={saveNote}
          style={{ marginTop: 8, minHeight: 36, fontSize: 13 }}
        />
      )}
      {readOnly && question.note && <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-soft)' }}>Note: {question.note}</div>}

      {(question.photos?.length > 0 || !readOnly) && (
        <div style={{ marginTop: 8 }}>
          <div className="grid grid-photos" style={{ marginBottom: readOnly ? 0 : 8 }}>
            {question.photos?.map((p) => (
              <div className="photo-tile" key={p.id}>
                <img src={p.url} alt="Audit evidence" loading="lazy" />
              </div>
            ))}
          </div>
          {!readOnly && (
            <div
              className="upload-drop"
              onClick={() => fileInput.current.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            >
              {uploading ? 'Uploading...' : '+ Add photo'}
              <input ref={fileInput} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AuditContent({ auditId }) {
  const [audit, setAudit] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reportStatus, setReportStatus] = useState(null);

  async function refresh() {
    setAudit(await api.getAudit(auditId));
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [auditId]);

  if (!audit) return <div className="card">Loading...</div>;

  const readOnly = audit.status === 'completed';
  const allQuestions = audit.sections.flatMap((s) => s.questions);
  const answeredCount = allQuestions.filter((q) => q.answer).length;
  const liveYes = allQuestions.filter((q) => q.answer === 'yes').length;
  const liveScored = allQuestions.filter((q) => q.answer === 'yes' || q.answer === 'no').length;
  const liveScore = liveScored > 0 ? Math.round((liveYes / liveScored) * 1000) / 10 : null;

  async function complete() {
    setBusy(true);
    setError(null);
    try {
      await api.completeAudit(auditId);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendReport() {
    setBusy(true);
    setReportStatus(null);
    try {
      const res = await api.sendReport(auditId);
      setReportStatus({ ok: true, message: `Report sent to ${res.sentTo.join(', ')}.` });
    } catch (e) {
      setReportStatus({ ok: false, message: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>{audit.stores.store_name} <span style={{ color: 'var(--ink-soft)', fontWeight: 400 }}>#{audit.stores.store_number}</span></h1>
            <div style={{ color: 'var(--ink-soft)', fontSize: 14 }}>{audit.template_name} · {audit.stores.district_manager}{audit.stores.region ? ` · ${audit.stores.region}` : ''}</div>
            <div style={{ color: 'var(--ink-soft)', fontSize: 13, marginTop: 4 }}>
              {readOnly ? `Completed ${new Date(audit.completed_at).toLocaleString()}` : `Started ${new Date(audit.started_at).toLocaleString()}`}
              {' · '}{answeredCount}/{allQuestions.length} answered
            </div>
          </div>
          <ScoreRing score={readOnly ? audit.overall_score : liveScore} />
        </div>

        {error && <div style={{ color: 'var(--rejected)', marginTop: 12 }}>{error}</div>}

        {!readOnly && (
          <div style={{ marginTop: 14 }}>
            <button className="primary" onClick={complete} disabled={busy}>Complete audit</button>
          </div>
        )}

        {readOnly && (
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="primary" onClick={sendReport} disabled={busy || (!audit.stores.store_email && !audit.stores.district_manager_email)}>
              {audit.report_sent_at ? 'Resend report to store' : 'Send report to store'}
            </button>
            {!audit.stores.store_email && !audit.stores.district_manager_email && <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>No store or district manager email on file for this store.</span>}
            {audit.report_sent_at && <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Last sent {new Date(audit.report_sent_at).toLocaleString()}</span>}
          </div>
        )}
        {reportStatus && (
          <div style={{ marginTop: 8, color: reportStatus.ok ? 'var(--approved)' : 'var(--rejected)', fontSize: 13 }}>{reportStatus.message}</div>
        )}
      </div>

      {audit.sections.map((section) => (
        <div className="card audit-section" key={section.id}>
          <h2>{section.name}</h2>
          {section.questions.map((q) => (
            <QuestionRow key={q.id} question={q} auditId={auditId} readOnly={readOnly} onChanged={refresh} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function AuditPage({ params }) {
  return <AppFrame>{() => <AuditContent auditId={params.id} />}</AppFrame>;
}
