'use client';

import { useEffect, useState } from 'react';
import AppFrame from '@/components/AppFrame';
import { api } from '@/lib/api';
import StoresImportPanel from '@/components/StoresImportPanel';

function StoresContent() {
  const [stores, setStores] = useState(null);
  const [form, setForm] = useState({ storeNumber: '', storeName: '', district: '', storeManagerName: '', storeManagerEmail: '', districtManagerEmail: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function refresh() {
    setStores(await api.getStores());
  }
  useEffect(() => { refresh(); }, []);

  async function addStore() {
    if (!form.storeNumber || !form.storeName || !form.district) {
      setError('Store number, name, and district (DM name) are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.createStore(form);
      setForm({ storeNumber: '', storeName: '', district: '', storeManagerName: '', storeManagerEmail: '', districtManagerEmail: '' });
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
          "District" is just your DM's name — no separate district name needed. Reports go to whichever of the two emails below are filled in (both, if both are set).
        </p>
        {error && <div style={{ color: 'var(--rejected)', margin: '8px 0' }}>{error}</div>}
        <div className="grid grid-2" style={{ marginTop: 10 }}>
          <input type="text" placeholder="Store #" value={form.storeNumber} onChange={(e) => setForm({ ...form, storeNumber: e.target.value })} />
          <input type="text" placeholder="Store name" value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} />
          <input type="text" placeholder="District (DM's name)" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
          <input type="email" placeholder="District manager email" value={form.districtManagerEmail} onChange={(e) => setForm({ ...form, districtManagerEmail: e.target.value })} />
          <input type="text" placeholder="Store manager name" value={form.storeManagerName} onChange={(e) => setForm({ ...form, storeManagerName: e.target.value })} />
          <input type="email" placeholder="Store manager email" value={form.storeManagerEmail} onChange={(e) => setForm({ ...form, storeManagerEmail: e.target.value })} />
        </div>
        <button className="primary" style={{ marginTop: 10 }} onClick={addStore} disabled={busy}>Add store</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr><th>Store</th><th>District (DM)</th><th>DM email</th><th>Store manager</th><th>Store manager email</th></tr>
          </thead>
          <tbody>
            {(stores || []).map((s) => (
              <tr key={s.id}>
                <td>{s.store_number} — {s.store_name}</td>
                <td>{s.district}</td>
                <td>{s.district_manager_email || '—'}</td>
                <td>{s.store_manager_name || '—'}</td>
                <td>{s.store_manager_email || '—'}</td>
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
