'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppFrame from '@/components/AppFrame';
import { api } from '@/lib/api';
import ScoreRing from '@/components/ScoreRing';
import MonthYearSelect from '@/components/MonthYearSelect';

// Tracking only starts once you've actually cut over to this system — no
// point flagging months you ran on the old spreadsheet as "missing."
const TRACKING_START_MONTH = '2026-10';

function defaultTrackingMonth() {
  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return current < TRACKING_START_MONTH ? TRACKING_START_MONTH : current;
}

function MissingAuditsSection({ storeId }) {
  const [month, setMonth] = useState(defaultTrackingMonth());
  const [data, setData] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const params = { month };
    if (storeId) params.storeId = storeId;
    api.getMissingAudits(params).then(setData);
  }, [month, storeId]);

  const totalMissing = data ? data.templates.reduce((sum, t) => sum + t.missingCount, 0) : null;
  const templatesWithGaps = data ? data.templates.filter((t) => t.missingCount > 0) : [];

  function goToStore(templateId, store) {
    if (store.existingAuditId) router.push(`/audits/${store.existingAuditId}`);
    else router.push(`/audits/new?storeId=${store.storeId}&templateId=${templateId}&month=${month}`);
  }

  return (
    <details className="card">
      <summary style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', listStyle: 'none' }}>
        <h2 style={{ display: 'inline', margin: 0 }}>
          Audits needing completion{totalMissing !== null && ` (${totalMissing})`}
        </h2>
      </summary>

      <div style={{ marginTop: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Month:</span>
        <MonthYearSelect value={month} onChange={setMonth} />
      </div>

      {!data && <div style={{ color: 'var(--ink-soft)' }}>Loading...</div>}
      {data && templatesWithGaps.length === 0 && <div className="empty-state">Every audit type is complete for this month. Nice.</div>}

      {templatesWithGaps.map((t) => (
        <details key={t.templateId} style={{ marginTop: 8, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 14, listStyle: 'none' }}>
            {t.templateName} ({t.missingCount})
          </summary>
          <div style={{ marginTop: 8 }}>
            {t.stores.map((s) => (
              <div key={s.storeId} className="inline-edit-row" style={{ cursor: 'pointer' }} onClick={() => goToStore(t.templateId, s)}>
                <div style={{ flex: 1, fontSize: 14 }}>{s.storeName}</div>
                <span className="badge in_progress">{s.existingAuditId ? 'In progress' : 'Not started'}</span>
              </div>
            ))}
          </div>
        </details>
      ))}
    </details>
  );
}

function TasksPanel({ user, storeId, auditorEmail }) {
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
    api.getUsers().then(setUsers);
    if (user.role === 'admin') api.getStores().then(setStores);
    // eslint-disable-next-line
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

  const filtered = (tasks || []).filter((t) => (!storeId || String(t.store_id) === String(storeId)) && (!auditorEmail || t.assigned_to_email === auditorEmail));
  const openTasks = filtered.filter((t) => t.status === 'open');
  const doneTasks = filtered.filter((t) => t.status === 'done');

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{user.role === 'admin' ? 'Tasks' : 'My tasks'}</h2>
        {user.role === 'admin' && <button className="ghost small" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ Assign task'}</button>}
      </div>

      {showForm && (
        <div style={{ marginTop: 10, padding: 12, background: 'var(--card-raised)', borderRadius: 8 }}>
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

      {openTasks.length > 0 && (
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
  const [stores, setStores] = useState([]);
  const [users, setUsers] = useState([]);
  const [storeId, setStoreId] = useState('');
  const [auditorEmail, setAuditorEmail] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    api.getStores().then(setStores);
    api.getUsers().then(setUsers);
  }, []);

  useEffect(() => {
    const params = { threshold };
    if (storeId) params.storeId = storeId;
    if (auditorEmail) params.auditorEmail = auditorEmail;
    api.getDashboardSummary(params).then(setData);
  }, [threshold, storeId, auditorEmail]);

  return (
    <div>
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0 }}>RAD Dashboard</h1>
        <div className="dashboard-filters" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            <option value="">All stores</option>
            {[...stores].sort((a, b) => a.store_name.localeCompare(b.store_name)).map((s) => <option key={s.id} value={s.id}>{s.store_name}</option>)}
          </select>
          <select value={auditorEmail} onChange={(e) => setAuditorEmail(e.target.value)}>
            <option value="">All auditors</option>
            {users.map((u) => <option key={u.id} value={u.email}>{u.display_name}</option>)}
          </select>
        </div>
      </div>

      <TasksPanel user={user} storeId={storeId} auditorEmail={auditorEmail} />

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
            <thead><tr><th>Store</th><th>Auditor</th><th>Score</th><th>Audited</th></tr></thead>
            <tbody>
              {data.belowThreshold.map((s) => (
                <tr key={s.storeId}>
                  <td>{s.storeName}</td>
                  <td>{s.auditorName}</td>
                  <td><ScoreRing score={s.score} size={40} /></td>
                  <td><Link href={`/audits/${s.auditId}`}>{new Date(s.completedAt).toLocaleDateString()}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <MissingAuditsSection storeId={storeId} />

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
                  <td>{a.auditorName}</td>
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
