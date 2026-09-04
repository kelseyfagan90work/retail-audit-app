'use client';

import { useEffect, useState } from 'react';
import AppFrame from '@/components/AppFrame';
import { api } from '@/lib/api';

function StoresContent() {
  const [stores, setStores] = useState(null);
  const [form, setForm] = useState({ storeNumber: '', storeName: '', district: '', managerName: '', managerEmail: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function refresh() {
    setStores(await api.getStores());
  }
  useEffect(() => { refresh(); }, []);

  async function addStore() {
    if (!form.storeNumber || !form.storeName || !form.district) {
      setError('Store number, name, and district are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.createStore(form);
      setForm({ storeNumber: '', storeName: '', district: '', managerName: '', managerEmail: '' });
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h1>Stores</h1>
        <p style={{ color: 'var(--ink-soft)' }}>The manager email here is where audit reports get sent.</p>
        {error && <div style={{ color: 'var(--rejected)', margin: '8px 0' }}>{error}</div>}
        <div className="grid grid-2" style={{ marginTop: 10 }}>
          <input type="text" placeholder="Store #" value={form.storeNumber} onChange={(e) => setForm({ ...form, storeNumber: e.target.value })} />
          <input type="text" placeholder="Store name" value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} />
          <input type="text" placeholder="District" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
          <input type="text" placeholder="Manager name" value={form.managerName} onChange={(e) => setForm({ ...form, managerName: e.target.value })} />
          <input type="email" placeholder="Manager email" value={form.managerEmail} onChange={(e) => setForm({ ...form, managerEmail: e.target.value })} />
        </div>
        <button className="primary" style={{ marginTop: 10 }} onClick={addStore} disabled={busy}>Add store</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr><th>Store</th><th>District</th><th>Manager</th><th>Email</th></tr>
          </thead>
          <tbody>
            {(stores || []).map((s) => (
              <tr key={s.id}>
                <td>{s.store_number} — {s.store_name}</td>
                <td>{s.district}</td>
                <td>{s.manager_name || '—'}</td>
                <td>{s.manager_email || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function StoresPage() {
  return <AppFrame adminOnly>{() => <StoresContent />}</AppFrame>;
}
