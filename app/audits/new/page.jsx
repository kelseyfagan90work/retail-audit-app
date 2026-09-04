'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppFrame from '@/components/AppFrame';
import { api } from '@/lib/api';

function NewAuditContent() {
  const [stores, setStores] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [storeId, setStoreId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    api.getStores().then((s) => setStores(s.filter((x) => x.is_active)));
    api.getTemplates().then((t) => setTemplates(t.filter((x) => x.is_active)));
  }, []);

  async function start() {
    if (!storeId || !templateId) {
      setError('Pick a store and a template.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const audit = await api.createAudit({ storeId: Number(storeId), templateId: Number(templateId) });
      router.push(`/audits/${audit.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h1>Start a new audit</h1>
      {error && <div style={{ color: 'var(--rejected)', margin: '10px 0' }}>{error}</div>}
      <div style={{ margin: '16px 0' }}>
        <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 4 }}>Store</label>
        <select value={storeId} onChange={(e) => setStoreId(e.target.value)} style={{ width: '100%' }}>
          <option value="">Select a store...</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>{s.store_number} — {s.store_name} ({s.district})</option>
          ))}
        </select>
      </div>
      <div style={{ margin: '16px 0' }}>
        <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 4 }}>Audit template</label>
        <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} style={{ width: '100%' }}>
          <option value="">Select a template...</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      <button className="primary" onClick={start} disabled={busy}>{busy ? 'Starting...' : 'Start audit'}</button>
    </div>
  );
}

export default function NewAuditPage() {
  return <AppFrame>{() => <NewAuditContent />}</AppFrame>;
}
