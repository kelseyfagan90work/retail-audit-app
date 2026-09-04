'use client';

import { useEffect, useState } from 'react';
import AppFrame from '@/components/AppFrame';
import { api } from '@/lib/api';

function UserRow({ u, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(u.display_name);
  const [role, setRole] = useState(u.role);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await api.updateUser(u.id, { displayName, role });
      setEditing(false);
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <tr>
        <td>{u.display_name}</td>
        <td>{u.email}</td>
        <td>{u.role}</td>
        <td><button className="ghost small" onClick={() => setEditing(true)}>Edit</button></td>
      </tr>
    );
  }

  return (
    <tr>
      <td><input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={{ width: '100%' }} /></td>
      <td>{u.email}</td>
      <td>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="auditor">auditor</option>
          <option value="admin">admin</option>
        </select>
      </td>
      <td style={{ display: 'flex', gap: 6 }}>
        <button className="primary small" onClick={save} disabled={busy}>Save</button>
        <button className="ghost small" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
      </td>
    </tr>
  );
}

function UsersContent() {
  const [users, setUsers] = useState(null);
  const [requests, setRequests] = useState(null);
  const [form, setForm] = useState({ email: '', displayName: '', role: 'auditor' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  async function refresh() {
    setUsers(await api.getUsers());
    setRequests(await api.getInviteRequests());
  }
  useEffect(() => { refresh(); }, []);

  async function invite() {
    if (!form.email || !form.displayName) {
      setError('Name and email are required.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.inviteUser({ ...form, redirectTo: window.location.origin });
      setNotice(`Invite sent to ${form.email}.`);
      const matchingRequest = requests.find((r) => r.email.toLowerCase() === form.email.toLowerCase());
      if (matchingRequest) await api.updateInviteRequest(matchingRequest.id, 'invited');
      setForm({ email: '', displayName: '', role: 'auditor' });
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function useRequest(r) {
    setForm({ email: r.email, displayName: r.name, role: 'auditor' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function dismissRequest(id) {
    await api.updateInviteRequest(id, 'dismissed');
    await refresh();
  }

  return (
    <div>
      {requests && requests.length > 0 && (
        <div className="card">
          <h2>Access requests</h2>
          {requests.map((r) => (
            <div key={r.id} className="inline-edit-row">
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{r.name} <span style={{ color: 'var(--ink-soft)', fontWeight: 400 }}>· {r.email}</span></div>
                {r.message && <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{r.message}</div>}
              </div>
              <button className="primary small" onClick={() => useRequest(r)}>Use in invite form</button>
              <button className="ghost small" onClick={() => dismissRequest(r.id)}>Dismiss</button>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h1>Users</h1>
        <p style={{ color: 'var(--ink-soft)' }}>
          Invite someone and they'll get an email with a link to set their password and sign in — no manual setup on your end.
        </p>
        {error && <div style={{ color: 'var(--rejected)', margin: '8px 0' }}>{error}</div>}
        {notice && <div style={{ color: 'var(--approved)', margin: '8px 0' }}>{notice}</div>}
        <div className="grid grid-2" style={{ marginTop: 10 }}>
          <input type="text" placeholder="Name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="auditor">auditor</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <button className="primary" style={{ marginTop: 10 }} onClick={invite} disabled={busy}>{busy ? 'Sending...' : 'Send invite'}</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
          <tbody>
            {(users || []).map((u) => <UserRow key={u.id} u={u} onSaved={refresh} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function UsersPage() {
  return <AppFrame adminOnly>{() => <UsersContent />}</AppFrame>;
}
