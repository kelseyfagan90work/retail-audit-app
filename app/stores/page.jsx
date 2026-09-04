'use client';

import { useEffect, useState } from 'react';
import AppFrame from '@/components/AppFrame';
import { api } from '@/lib/api';
import StoresImportPanel from '@/components/StoresImportPanel';

function StoresContent() {
  const [stores, setStores] = useState(null);
  const [form, setForm] = useState({ storeNumber: '', storeName: '', region: '', districtManager: '', districtManagerEmail: '', storeEmail: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function refresh() {
    setStores(await api.getStores());
  }
  useEffect(() => { refresh(); }, []);

  async function addStore() {
    if (!form.storeNumber || !form.storeName || !form.districtManager) {
      setError('Store number, name, and district manager are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.createStore(form);
      setForm({ storeNumber: '', storeName: '', region: '', districtManager: '', districtManagerEmail: '', storeEmail: '' });
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <StoresImportPanel onImported={refresh} />

      <div className="card">
        <h1>Stores</h1>
        <p style={{ color: 'var(--ink-soft)' }}>
          Reports go to whichever of the two emails below are filled in (both, if both are set).
        </p>
        {error && <div style={{ color: 'var(--rejected)', margin: '8px 0' }}>{error}</div>}
        <div className="grid grid-2" style={{ marginTop: 10 }}>
          <input type="text" placeholder="Store #" value={form.storeNumber} onChange={(e) => setForm({ ...form, storeNumber: e.target.value })} />
          <input type="text" placeholder="Store name" value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} />
          <input type="text" placeholder="Region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          <input type="text" placeholder="District manager" value={form.districtManager} onChange={(e) => setForm({ ...form, districtManager: e.target.value })} />
          <input type="email" placeholder="District manager email" value={form.districtManagerEmail} onChange={(e) => setForm({ ...form, districtManagerEmail: e.target.value })} />
          <input type="email" placeholder="Store email" value={form.storeEmail} onChange={(e) => setForm({ ...form, storeEmail: e.target.value })} />
        </div>
        <button className="primary" style={{ marginTop: 10 }} onClick={addStore} disabled={busy}>Add store</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr><th>Store</th><th>Region</th><th>District Manager</th><th>DM Email</th><th>Store Email</th></tr>
          </thead>
          <tbody>
            {(stores || []).map((s) => (
              <tr key={s.id}>
                <td>{s.store_number} — {s.store_name}</td>
                <td>{s.region || '—'}</td>
                <td>{s.district_manager}</td>
                <td>{s.district_manager_email || '—'}</td>
                <td>{s.store_email || '—'}</td>
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
