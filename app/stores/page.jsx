'use client';

import { useEffect, useState } from 'react';
import AppFrame from '@/components/AppFrame';
import { api } from '@/lib/api';
import StoresImportPanel from '@/components/StoresImportPanel';

function StoreRow({ store, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(store);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setForm(store); }, [store]);

  async function save() {
    setBusy(true);
    try {
      await api.updateStore(store.id, {
        storeName: form.store_name,
        region: form.region,
        districtManager: form.district_manager,
        districtManagerEmail: form.district_manager_email,
        storeEmail: form.store_email,
      });
      setEditing(false);
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <tr>
        <td>{store.store_name}</td>
        <td>{store.region || '—'}</td>
        <td>{store.district_manager}</td>
        <td>{store.district_manager_email || '—'}</td>
        <td>{store.store_email || '—'}</td>
        <td><button className="ghost small" onClick={() => setEditing(true)}>Edit</button></td>
      </tr>
    );
  }

  return (
    <tr>
      <td><input type="text" value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} style={{ width: '100%' }} /></td>
      <td><input type="text" value={form.region || ''} onChange={(e) => setForm({ ...form, region: e.target.value })} style={{ width: '100%' }} /></td>
      <td><input type="text" value={form.district_manager} onChange={(e) => setForm({ ...form, district_manager: e.target.value })} style={{ width: '100%' }} /></td>
      <td><input type="email" value={form.district_manager_email || ''} onChange={(e) => setForm({ ...form, district_manager_email: e.target.value })} style={{ width: '100%' }} /></td>
      <td><input type="email" value={form.store_email || ''} onChange={(e) => setForm({ ...form, store_email: e.target.value })} style={{ width: '100%' }} /></td>
      <td style={{ display: 'flex', gap: 6 }}>
        <button className="primary small" onClick={save} disabled={busy}>Save</button>
        <button className="ghost small" onClick={() => { setForm(store); setEditing(false); }} disabled={busy}>Cancel</button>
      </td>
    </tr>
  );
}

function StoresContent() {
  const [stores, setStores] = useState(null);
  const [form, setForm] = useState({ storeName: '', region: '', districtManager: '', districtManagerEmail: '', storeEmail: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function refresh() {
    setStores(await api.getStores());
  }
  useEffect(() => { refresh(); }, []);

  async function addStore() {
    if (!form.storeName || !form.districtManager) {
      setError('Store name and district manager are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.createStore(form);
      setForm({ storeName: '', region: '', districtManager: '', districtManagerEmail: '', storeEmail: '' });
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
          Reports go to whichever of the two emails below are filled in (both, if both are set). Click Edit on any row to update it directly — no need to re-import a CSV for small changes.
        </p>
        {error && <div style={{ color: 'var(--rejected)', margin: '8px 0' }}>{error}</div>}
        <div className="grid grid-2" style={{ marginTop: 10 }}>
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
            <tr><th>Store</th><th>Region</th><th>District Manager</th><th>DM Email</th><th>Store Email</th><th></th></tr>
          </thead>
          <tbody>
            {[...(stores || [])].sort((a, b) => a.store_name.localeCompare(b.store_name)).map((s) => (
              <StoreRow key={s.id} store={s} onSaved={refresh} />
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
