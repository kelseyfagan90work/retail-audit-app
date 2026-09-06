'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppFrame from '@/components/AppFrame';
import { api } from '@/lib/api';
import TemplateImportPanel from '@/components/TemplateImportPanel';

function TemplatesContent() {
  const [templates, setTemplates] = useState(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setTemplates(await api.getTemplates());
  }
  useEffect(() => { refresh(); }, []);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.createTemplate({ name });
      setName('');
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h1>Audit Templates</h1>
        <p style={{ color: 'var(--ink-soft)' }}>Edit sections and questions here. Changes only affect audits started after you save — audits already in progress or completed keep the questions they were scored on.</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input type="text" placeholder="New template name" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1 }} />
          <button className="primary" onClick={create} disabled={busy}>Create</button>
        </div>
      </div>

      <TemplateImportPanel />

      {!templates && <div className="card">Loading...</div>}
      {templates && templates.filter((t) => t.is_active).map((t) => (
        <Link href={`/templates/${t.id}`} key={t.id} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card">
            <div style={{ fontWeight: 600 }}>{t.name}</div>
            {t.description && <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>{t.description}</div>}
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function TemplatesPage() {
  return <AppFrame adminOnly>{() => <TemplatesContent />}</AppFrame>;
}
