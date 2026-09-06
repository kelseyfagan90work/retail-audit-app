'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppFrame from '@/components/AppFrame';
import BackButton from '@/components/BackButton';
import MonthYearSelect from '@/components/MonthYearSelect';
import { api } from '@/lib/api';

function NewAuditContent() {
  const searchParams = useSearchParams();
  const [stores, setStores] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [storeId, setStoreId] = useState(searchParams.get('storeId') || '');
  const [templateId, setTemplateId] = useState(searchParams.get('templateId') || '');
  const [auditPeriod, setAuditPeriod] = useState(searchParams.get('month') || new Date().toISOString().slice(0, 7));
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
      const audit = await api.createAudit({ storeId: Number(storeId), templateId: Number(templateId), auditPeriod });
      router.push(`/audits/${audit.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <BackButton fallbackHref="/audits" />
      <h1>Start a new audit</h1>
      {error && <div style={{ color: 'var(--rejected)', margin: '10px 0' }}>{error}</div>}
      <div style={{ margin: '16px 0' }}>
        <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 4 }}>Store</label>
        <select value={storeId} onChange={(e) => setStoreId(e.target.value)} style={{ width: '100%' }}>
          <option value="">Select a store...</option>
          {[...stores].sort((a, b) => a.store_name.localeCompare(b.store_name)).map((s) => (
            <option key={s.id} value={s.id}>{s.store_name}</option>
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
      <div style={{ margin: '16px 0' }}>
        <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 4 }}>Audit month</label>
        <MonthYearSelect value={auditPeriod} onChange={setAuditPeriod} />
        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>Defaults to the current month — change this if you're auditing a prior month.</div>
      </div>
      <button className="primary" onClick={start} disabled={busy}>{busy ? 'Starting...' : 'Start audit'}</button>
    </div>
  );
}

export default function NewAuditPage() {
  return (
    <AppFrame>
      {() => (
        <Suspense fallback={<div className="card">Loading...</div>}>
          <NewAuditContent />
        </Suspense>
      )}
    </AppFrame>
  );
}
