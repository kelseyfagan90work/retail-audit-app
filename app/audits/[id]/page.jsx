'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppFrame from '@/components/AppFrame';
import BackButton from '@/components/BackButton';
import { api, uploadToStorage } from '@/lib/api';
import { compressImage } from '@/lib/compressImage';
import AnswerToggle from '@/components/AnswerToggle';
import ScoreRing from '@/components/ScoreRing';
import MonthYearSelect from '@/components/MonthYearSelect';

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

function SectionTaskButton({ section, audit, users }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(`Follow up: ${section.name} at ${audit.stores.store_name}`);
  const [assignedToEmail, setAssignedToEmail] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!title || !assignedToEmail) return;
    setBusy(true);
    try {
      await api.createTask({
        title,
        description: `From ${section.name} on the ${audit.template_name} audit.`,
        storeId: audit.store_id,
        auditId: audit.id,
        assignedToEmail,
        dueDate: dueDate || null,
      });
      setDone(true);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button className="ghost small" onClick={() => setOpen((o) => !o)}>
        {done ? '✓ Task added' : open ? 'Cancel' : '+ Task'}
      </button>
      {open && (
        <div style={{ marginTop: 10, padding: 12, background: 'var(--card-raised)', borderRadius: 8 }}>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
          <div className="grid grid-2">
            <select value={assignedToEmail} onChange={(e) => setAssignedToEmail(e.target.value)}>
              <option value="">Assign to...</option>
              {users.map((u) => <option key={u.id} value={u.email}>{u.display_name}</option>)}
            </select>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <button className="primary small" style={{ marginTop: 8 }} onClick={submit} disabled={busy || !title || !assignedToEmail}>Assign</button>
        </div>
      )}
    </div>
  );
}

function AuditContent({ auditId, user }) {
  const [audit, setAudit] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reportStatus, setReportStatus] = useState(null);
  const [managerOnShift, setManagerOnShift] = useState('');
  const [overallNote, setOverallNote] = useState('');
  const [auditPeriod, setAuditPeriod] = useState('');
  const router = useRouter();

  async function refresh() {
    const data = await api.getAudit(auditId);
    setAudit(data);
    setManagerOnShift(data.manager_on_shift || '');
    setOverallNote(data.overall_note || '');
    setAuditPeriod(data.audit_period ? data.audit_period.slice(0, 7) : '');
  }
  useEffect(() => { refresh(); api.getUsers().then(setUsers); /* eslint-disable-next-line */ }, [auditId]);

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

  async function setAnnounced(value) {
    await api.updateAudit(auditId, { announced: audit.announced === value ? null : value });
    await refresh();
  }

  async function saveManagerOnShift() {
    if (managerOnShift === (audit.manager_on_shift || '')) return;
    await api.updateAudit(auditId, { managerOnShift });
  }

  async function saveOverallNote() {
    if (overallNote === (audit.overall_note || '')) return;
    await api.updateAudit(auditId, { overallNote });
  }

  async function saveAuditPeriod(value) {
    setAuditPeriod(value);
    await api.updateAudit(auditId, { auditPeriod: value });
    await refresh();
  }

  async function reopen() {
    if (!confirm('Reopen this audit for editing? Its score will be recalculated when you complete it again.')) return;
    setBusy(true);
    try {
      await api.updateAudit(auditId, { status: 'in_progress' });
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function discard() {
    if (!confirm('Discard this audit permanently? This cannot be undone.')) return;
    setBusy(true);
    try {
      await api.discardAudit(auditId);
      router.push('/audits');
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  const canDiscard = user.role === 'admin' || (audit.auditor_email === user.email && audit.status === 'in_progress');

  return (
    <div>
      <BackButton fallbackHref="/audits" />

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>{audit.stores.store_name}</h1>
            <div style={{ color: 'var(--ink-soft)', fontSize: 14 }}>
              {audit.template_name}{audit.stores.region ? ` · ${audit.stores.region}` : ''}
            </div>
            <div style={{ color: 'var(--ink-soft)', fontSize: 13, marginTop: 6, lineHeight: 1.7 }}>
              Auditor: {audit.auditor_name || audit.auditor_email}<br />
              Started: {new Date(audit.started_at).toLocaleString()}<br />
              {audit.completed_at && <>Completed: {new Date(audit.completed_at).toLocaleString()}<br /></>}
              {answeredCount}/{allQuestions.length} answered
            </div>
          </div>
          <ScoreRing score={readOnly ? audit.overall_score : liveScore} />
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginTop: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'block', marginBottom: 4 }}>Audit month</label>
            <MonthYearSelect value={auditPeriod} onChange={saveAuditPeriod} disabled={false} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'block', marginBottom: 4 }}>Announced or unannounced</label>
            <div className="answer-toggle">
              <button
                type="button"
                disabled={readOnly}
                className={audit.announced === true ? 'selected yes' : ''}
                onClick={() => setAnnounced(true)}
              >Announced</button>
              <button
                type="button"
                disabled={readOnly}
                className={audit.announced === false ? 'selected no' : ''}
                onClick={() => setAnnounced(false)}
              >Unannounced</button>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'block', marginBottom: 4 }}>Manager on shift</label>
            <input
              type="text"
              value={managerOnShift}
              onChange={(e) => setManagerOnShift(e.target.value)}
              onBlur={saveManagerOnShift}
              disabled={readOnly}
              placeholder="Name"
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {error && <div style={{ color: 'var(--rejected)', marginTop: 12 }}>{error}</div>}

        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          {!readOnly && <button className="primary" onClick={complete} disabled={busy}>Complete audit</button>}
          {readOnly && (
            <button className="primary" onClick={sendReport} disabled={busy || (!audit.stores.store_email && !audit.stores.district_manager_email)}>
              {audit.report_sent_at ? 'Resend report to store' : 'Send report to store'}
            </button>
          )}
          <a href={`/api/audits/${auditId}/export-pdf`} target="_blank" rel="noreferrer">
            <button className="ghost" type="button">Export PDF</button>
          </a>
          {readOnly && user.role === 'admin' && <button className="ghost" onClick={reopen} disabled={busy}>Edit audit</button>}
          {canDiscard && <button className="danger-ghost" onClick={discard} disabled={busy}>Discard audit</button>}
        </div>
        {readOnly && !audit.stores.store_email && !audit.stores.district_manager_email && (
          <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-soft)' }}>No store or district manager email on file for this store.</div>
        )}
        {reportStatus && (
          <div style={{ marginTop: 8, color: reportStatus.ok ? 'var(--approved)' : 'var(--rejected)', fontSize: 13 }}>{reportStatus.message}</div>
        )}
      </div>

      {audit.sections.map((section, i) => (
        <div className="card audit-section" key={section.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="section-index">{i + 1}</span>
              <h2 style={{ margin: 0 }}>{section.name}</h2>
            </div>
            <SectionTaskButton section={section} audit={audit} users={users} />
          </div>
          {section.questions.map((q) => (
            <QuestionRow key={q.id} question={q} auditId={auditId} readOnly={readOnly} onChanged={refresh} />
          ))}
        </div>
      ))}

      <div className="card">
        <h2>Overall notes</h2>
        <textarea
          placeholder="Any additional notes about this visit..."
          value={overallNote}
          onChange={(e) => setOverallNote(e.target.value)}
          onBlur={saveOverallNote}
          style={{ minHeight: 80 }}
        />
      </div>
    </div>
  );
}

export default function AuditPage({ params }) {
  return <AppFrame>{(user) => <AuditContent auditId={params.id} user={user} />}</AppFrame>;
}
