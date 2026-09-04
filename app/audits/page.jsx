'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppFrame from '@/components/AppFrame';
import { api } from '@/lib/api';
import ScoreRing from '@/components/ScoreRing';

function AuditsContent() {
  const [status, setStatus] = useState('in_progress');
  const [audits, setAudits] = useState(null);

  useEffect(() => {
    api.getAudits(status).then(setAudits);
  }, [status]);

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Audits</h1>
          <Link href="/audits/new"><button className="primary">Start new audit</button></Link>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button className={status === 'in_progress' ? 'primary' : 'ghost'} onClick={() => setStatus('in_progress')}>In progress</button>
          <button className={status === 'completed' ? 'primary' : 'ghost'} onClick={() => setStatus('completed')}>Completed</button>
        </div>
      </div>

      {!audits && <div className="card">Loading...</div>}
      {audits && audits.length === 0 && <div className="card empty-state">No audits here yet.</div>}

      {audits && audits.length > 0 && (
        <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
          {audits.map((a) => (
            <Link href={`/audits/${a.id}`} key={a.id} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{a.stores.store_number} — {a.stores.store_name}</div>
                  <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>
                    {a.template_name} · {a.stores.district} · {new Date(a.started_at).toLocaleDateString()}
                  </div>
                </div>
                {a.status === 'completed' ? <ScoreRing score={a.overall_score} size={48} /> : <span className="badge in_progress">In progress</span>}
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
