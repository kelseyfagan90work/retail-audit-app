'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppFrame from '@/components/AppFrame';
import { api } from '@/lib/api';
import ScoreRing from '@/components/ScoreRing';

function TasksPanel({ user }) {
  const [tasks, setTasks] = useState(null);
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', assignedToEmail: '', storeId: '', dueDate: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function refresh() {
    setTasks(await api.getTasks());
  }
  useEffect(() => {
    refresh();
    if (user.role === 'admin') {
      api.getUsers().then(setUsers);
      api.getStores().then(setStores);
    }
  }, [user.role]);

  async function toggle(task) {
    await api.updateTask(task.id, { status: task.status === 'done' ? 'open' : 'done' });
    await refresh();
  }

  async function assignTask() {
    if (!form.title || !form.assignedToEmail) {
      setError('Title and assignee are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.createTask({ ...form, storeId: form.storeId || null, dueDate: form.dueDate || null });
      setForm({ title: '', description: '', assignedToEmail: '', storeId: '', dueDate: '' });
      setShowForm(false);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const openTasks = (tasks || []).filter((t) => t.status === 'open');
  const doneTasks = (tasks || []).filter((t) => t.status === 'done');

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{user.role === 'admin' ? 'Tasks' : 'My tasks'}</h2>
        {user.role === 'admin' && <button className="ghost small" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ Assign task'}</button>}
      </div>

      {showForm && (
        <div style={{ marginTop: 10, padding: 12, background: 'var(--paper)', borderRadius: 8 }}>
          {error && <div style={{ color: 'var(--rejected)', marginBottom: 8, fontSize: 13 }}>{error}</div>}
          <input type="text" placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ width: '100%', marginBottom: 8 }} />
          <textarea placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ marginBottom: 8, minHeight: 44 }} />
          <div className="grid grid-2">
            <select value={form.assignedToEmail} onChange={(e) => setForm({ ...form, assignedToEmail: e.target.value })}>
              <option value="">Assign to...</option>
              {users.map((u) => <option key={u.id} value={u.email}>{u.display_name} ({u.role})</option>)}
            </select>
            <select value={form.storeId} onChange={(e) => setForm({ ...form, storeId: e.target.value })}>
              <option value="">No store (optional)</option>
              {[...stores].sort((a, b) => a.store_name.localeCompare(b.store_name)).map((s) => <option key={s.id} value={s.id}>{s.store_name}</option>)}
            </select>
          </div>
          <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} style={{ marginTop: 8 }} />
          <div style={{ marginTop: 8 }}>
            <button className="primary small" onClick={assignTask} disabled={busy}>Assign</button>
          </div>
        </div>
      )}

      {!tasks && <div style={{ marginTop: 10, color: 'var(--ink-soft)' }}>Loading...</div>}
      {tasks && openTasks.length === 0 && doneTasks.length === 0 && <div className="empty-state">No tasks.</div>}

      {tasks && openTasks.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {openTasks.map((t) => (
            <div key={t.id} className="inline-edit-row" style={{ alignItems: 'flex-start' }}>
              <input type="checkbox" checked={false} onChange={() => toggle(t)} style={{ marginTop: 3 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{t.title}</div>
                {t.description && <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{t.description}</div>}
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                  {user.role === 'admin' && `${t.assigned_to_email} · `}
                  {t.stores && `${t.stores.store_name} · `}
                  {t.due_date ? `Due ${t.due_date}` : 'No due date'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {doneTasks.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary style={{ fontSize: 13, color: 'var(--ink-soft)', cursor: 'pointer' }}>{doneTasks.length} completed</summary>
          {doneTasks.map((t) => (
            <div key={t.id} className="inline-edit-row">
              <input type="checkbox" checked={true} onChange={() => toggle(t)} />
              <div style={{ flex: 1, textDecoration: 'line-through', color: 'var(--ink-soft)' }}>{t.title}</div>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}

function DashboardContent(user) {
  const [threshold, setThreshold] = useState(80);
  const [overdueDays, setOverdueDays] = useState(30);
  const [data, setData] = useState(null);

  useEffect(() => {
    api.getDashboardSummary({ threshold, overdueDays }).then(setData);
  }, [threshold, overdueDays]);

  return (
    <div>
      <div className="card">
        <h1>Dashboard</h1>
        <p style={{ color: 'var(--ink-soft)' }}>What needs attention right now.</p>
      </div>

      <TasksPanel user={user} />

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Stores below threshold</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-soft)' }}>
            Below <input type="number" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} style={{ width: 60 }} />%
          </div>
        </div>
        {!data && <div style={{ color: 'var(--ink-soft)' }}>Loading...</div>}
        {data && data.belowThreshold.length === 0 && <div className="empty-state">No stores below this threshold. Nice.</div>}
        {data && data.belowThreshold.length > 0 && (
          <table>
            <thead><tr><th>Store</th><th>Score</th><th>Audited</th></tr></thead>
            <tbody>
              {data.belowThreshold.map((s) => (
                <tr key={s.storeId}>
                  <td>{s.storeName}</td>
                  <td><ScoreRing score={s.score} size={40} /></td>
                  <td><Link href={`/audits/${s.auditId}`}>{new Date(s.completedAt).toLocaleDateString()}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Overdue for audit</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-soft)' }}>
            No audit in <input type="number" value={overdueDays} onChange={(e) => setOverdueDays(Number(e.target.value))} style={{ width: 60 }} /> days
          </div>
        </div>
        {data && data.overdueStores.length === 0 && <div className="empty-state">Every store's been audited recently.</div>}
        {data && data.overdueStores.length > 0 && (
          <table>
            <thead><tr><th>Store</th><th>Last audit</th></tr></thead>
            <tbody>
              {data.overdueStores.map((s) => (
                <tr key={s.storeId}>
                  <td>{s.storeName}</td>
                  <td>{s.neverAudited ? 'Never' : new Date(s.lastAuditDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Outstanding audits</h2>
        {data && data.outstandingAudits.length === 0 && <div className="empty-state">Nothing in progress right now.</div>}
        {data && data.outstandingAudits.length > 0 && (
          <table>
            <thead><tr><th>Store</th><th>Template</th><th>Auditor</th><th>Days open</th></tr></thead>
            <tbody>
              {data.outstandingAudits.map((a) => (
                <tr key={a.auditId}>
                  <td><Link href={`/audits/${a.auditId}`}>{a.storeName}</Link></td>
                  <td>{a.templateName}</td>
                  <td>{a.auditorEmail}</td>
                  <td>{a.daysOpen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return <AppFrame>{(user) => <DashboardContent {...user} />}</AppFrame>;
}
