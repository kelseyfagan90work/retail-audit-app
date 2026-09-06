'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppFrame from '@/components/AppFrame';
import { api } from '@/lib/api';
import ScoreRing from '@/components/ScoreRing';
import MonthYearSelect from '@/components/MonthYearSelect';

function AuditsContent() {
  const [status, setStatus] = useState('in_progress');
  const [audits, setAudits] = useState(null);
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState('');
  const [month, setMonth] = useState('');

  useEffect(() => {
    api.getAudits(status).then(setAudits);
  }, [status]);

  useEffect(() => { api.getStores().then(setStores); }, []);

  const filtered = (audits || []).filter((a) => {
    if (storeId && String(a.store_id) !== String(storeId)) return false;
    if (month) {
      const auditMonth = a.audit_period ? a.audit_period.slice(0, 7) : a.started_at.slice(0, 7);
      if (auditMonth !== month) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h1>Audits</h1>
          <Link href="/audits/new"><button className="primary">Start new audit</button></Link>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button className={status === 'in_progress' ? 'primary' : 'ghost'} onClick={() => setStatus('in_progress')}>In Progress</button>
          <button className={status === 'completed' ? 'primary' : 'ghost'} onClick={() => setStatus('completed')}>Completed</button>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginTop: 14 }}>
          <select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            <option value="">All stores</option>
            {[...stores].sort((a, b) => a.store_name.localeCompare(b.store_name)).map((s) => <option key={s.id} value={s.id}>{s.store_name}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <MonthYearSelect value={month} onChange={setMonth} />
            {month && <button className="ghost small" onClick={() => setMonth('')}>Clear</button>}
          </div>
        </div>
      </div>

      {!audits && <div className="card">Loading...</div>}
      {audits && filtered.length === 0 && <div className="card empty-state">No audits match these filters.</div>}

      {audits && filtered.length > 0 && (
        <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
          {[...filtered].sort((a, b) => a.stores.store_name.localeCompare(b.stores.store_name)).map((a) => (
            <Link href={`/audits/${a.id}`} key={a.id} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{a.stores.store_name}</div>
                  <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>
                    {a.template_name} · {new Date(a.started_at).toLocaleDateString()}
                  </div>
                </div>
                {a.status === 'completed' ? <ScoreRing score={a.overall_score} size={48} /> : <span className="badge in_progress">In Progress</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AuditsPage() {
  return <AppFrame>{() => <AuditsContent />}</AppFrame>;
}
