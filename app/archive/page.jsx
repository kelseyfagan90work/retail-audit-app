'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppFrame from '@/components/AppFrame';
import { api } from '@/lib/api';
import ScoreRing from '@/components/ScoreRing';
import MonthYearSelect from '@/components/MonthYearSelect';

function cleanParams(obj) {
  const out = {};
  Object.entries(obj).forEach(([k, v]) => { if (v) out[k] = v; });
  return out;
}

// Swap these four for your team's real addresses.
const STANDING_RECIPIENTS = [
  'chad.espinoza@stiiizy.com',
  'cindy.arteaga@stiiizy.com',
  'eric.kim@stiiizy.com',
  'caitlin.meyers@stiiizy.com',
];

function ArchiveContent({ user }) {
  const [stores, setStores] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [storeId, setStoreId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [month, setMonth] = useState('');
  const [audits, setAudits] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [recipient, setRecipient] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [checkedStanding, setCheckedStanding] = useState(new Set());

  function toggleStanding(email) {
    setCheckedStanding((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email); else next.add(email);
      return next;
    });
    setRecipient((prev) => {
      const list = prev.split(/[,;\s]+/).map((r) => r.trim()).filter(Boolean);
      const has = list.some((r) => r.toLowerCase() === email.toLowerCase());
      const next = has ? list.filter((r) => r.toLowerCase() !== email.toLowerCase()) : [...list, email];
      return next.join(', ');
    });
  }

  const selectedStoreNames = [...new Set((audits || []).filter((a) => selected.has(a.auditId)).map((a) => a.storeName))];
  const matchedStores = stores.filter((s) => selectedStoreNames.includes(s.store_name));
  const suggestedEmails = [...new Set(matchedStores.flatMap((s) => [s.store_email, s.district_manager_email].filter(Boolean)))];

  useEffect(() => {
    if (!recipient && suggestedEmails.length > 0) setRecipient(suggestedEmails.join(', '));
    // eslint-disable-next-line
  }, [selected]);
  useEffect(() => {
    api.getStores().then(setStores);
    api.getTemplates().then(setTemplates);
  }, []);

  const filters = useMemo(() => {
    const f = cleanParams({ storeId, templateId });
    if (month) { f.dateFrom = `${month}-01`; f.dateTo = `${month}-28`; }
    return f;
  }, [storeId, templateId, month]);

  useEffect(() => {
    api.getAuditsReport(filters).then((r) => { setAudits(r.audits); setSelected(new Set()); });
  }, [filters]);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!audits) return;
    setSelected((prev) => (prev.size === audits.length ? new Set() : new Set(audits.map((a) => a.auditId))));
  }

    async function sendSelected() {
    const allRecipients = recipient.split(/[,;\s]+/).map((r) => r.trim()).filter(Boolean);
    if (allRecipients.length === 0) { setSendResult({ ok: false, message: 'Enter at least one recipient email.' }); return; }

    const currentStoreEmails = new Set(
      stores
        .filter((s) => selectedStoreNames.includes(s.store_name) && s.store_email)
        .map((s) => s.store_email.toLowerCase())
    );
    const toRecipients = allRecipients.filter((r) => currentStoreEmails.has(r.toLowerCase()));
    const ccRecipients = allRecipients.filter((r) => !currentStoreEmails.has(r.toLowerCase()));
    const finalTo = toRecipients.length > 0 ? toRecipients : allRecipients;
    const finalCc = toRecipients.length > 0 ? ccRecipients : [];

    setSending(true);
    setSendResult(null);
    try {
      const res = await api.sendBulkReport([...selected], finalTo, finalCc);
      const sentTo = Array.isArray(res.sentTo) ? res.sentTo.join(', ') : res.sentTo;
      const sentCc = res.sentCc && res.sentCc.length ? ` (cc: ${res.sentCc.join(', ')})` : '';
      setSendResult({ ok: true, message: `Sent ${res.count} report(s) to ${sentTo}${sentCc}.` });
      setSelected(new Set());
    } catch (e) {
      setSendResult({ ok: false, message: e.message });
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h1>Archive</h1>
        <p style={{ color: 'var(--ink-soft)' }}>Browse and download every completed audit. Select a few and email them together as PDFs.</p>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginTop: 12 }}>
          <select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            <option value="">All stores</option>
            {[...stores].sort((a, b) => a.store_name.localeCompare(b.store_name)).map((s) => <option key={s.id} value={s.id}>{s.store_name}</option>)}
          </select>
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            <option value="">All audit types</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <MonthYearSelect value={month} onChange={setMonth} />
            {month && <button className="ghost small" onClick={() => setMonth('')}>Clear</button>}
          </div>
        </div>
      </div>

      {user.role === 'admin' && (
        <div className="card">
          <h2>Send Selected as Report</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{selected.size} selected</span>
            <input type="email" multiple placeholder="Recipient email(s), comma-separated" value={recipient} onChange={(e) => setRecipient(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
            <button className="primary" onClick={sendSelected} disabled={sending || selected.size === 0}>
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
          {suggestedEmails.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 6 }}>
              Suggested from selection: {suggestedEmails.join(', ')}{' '}
              <button className="ghost small" onClick={() => setRecipient(suggestedEmails.join(', '))}>Use</button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10, fontSize: 13 }}>
            {STANDING_RECIPIENTS.map((email) => (
              <label key={email} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input type="checkbox" checked={checkedStanding.has(email)} onChange={() => toggleStanding(email)} />
                {email}
              </label>
            ))}
          </div>
          {sendResult && (
            <div style={{ marginTop: 8, fontSize: 13, color: sendResult.ok ? 'var(--approved)' : 'var(--rejected)' }}>{sendResult.message}</div>
          )}
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        {!audits && <div style={{ padding: 20, color: 'var(--ink-soft)' }}>Loading...</div>}
        {audits && audits.length === 0 && <div className="empty-state">No completed audits match these filters.</div>}
        {audits && audits.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ marginTop: 0 }}>
              <thead>
                <tr>
                  <th><input type="checkbox" checked={selected.size === audits.length} onChange={toggleAll} /></th>
                  <th>Store</th><th>Audit Type</th><th>Month</th><th>Score</th><th></th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.auditId}>
                    <td><input type="checkbox" checked={selected.has(a.auditId)} onChange={() => toggle(a.auditId)} /></td>
                    <td><Link href={`/audits/${a.auditId}`}>{a.storeName}</Link></td>
                    <td>{a.templateName}</td>
                    <td>{a.auditPeriod ? a.auditPeriod.slice(0, 7) : new Date(a.completedAt).toLocaleDateString()}</td>
                    <td><ScoreRing score={a.score} size={32} /></td>
                    <td><a href={`/api/audits/${a.auditId}/export-pdf`} target="_blank" rel="noreferrer"><button className="ghost small" type="button">PDF</button></a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ArchivePage() {
  return <AppFrame>{(user) => <ArchiveContent user={user} />}</AppFrame>;
}
