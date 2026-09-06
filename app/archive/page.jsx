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
    if (!recipient) { setSendResult({ ok: false, message: 'Enter a recipient email.' }); return; }
    setSending(true);
    setSendResult(null);
    try {
      const res = await api.sendBulkReport([...selected], recipient);
      setSendResult({ ok: true, message: `Sent ${res.count} report(s) to ${res.sentTo}.` });
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
            <input type="email" placeholder="Recipient email" value={recipient} onChange={(e) => setRecipient(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
            <button className="primary" onClick={sendSelected} disabled={sending || selected.size === 0}>
              {sending ? 'Sending...' : 'Send'}
            </button>
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
