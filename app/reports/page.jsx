'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppFrame from '@/components/AppFrame';
import { api } from '@/lib/api';
import { downloadCsv } from '@/lib/csv';
import ScoreRing from '@/components/ScoreRing';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const BAR_COLORS = ['#2dd4bf', '#3ddc8f', '#f5b942', '#ff6b6b', '#8b93a3'];
const CHART_TOOLTIP = { background: '#1e222b', border: '1px solid #2a2f3a', borderRadius: 8, color: '#e8eaf0', fontSize: 13 };

function cleanParams(obj) {
  const out = {};
  Object.entries(obj).forEach(([k, v]) => { if (v) out[k] = v; });
  return out;
}

function announcedLabel(v) {
  if (v === true) return 'Announced';
  if (v === false) return 'Unannounced';
  return '—';
}

function ReportsContent() {
  const [stores, setStores] = useState([]);
  const [users, setUsers] = useState([]);
  const [region, setRegion] = useState('');
  const [districtManager, setDistrictManager] = useState('');
  const [storeId, setStoreId] = useState('');
  const [auditorEmail, setAuditorEmail] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [auditsData, setAuditsData] = useState(null);
  const [criteriaData, setCriteriaData] = useState(null);
  const [showAggregate, setShowAggregate] = useState(false);
  const [trendData, setTrendData] = useState(null);
  const [breakdownData, setBreakdownData] = useState(null);

  useEffect(() => {
    api.getStores().then(setStores);
    api.getUsers().then(setUsers);
  }, []);

  const filters = useMemo(
    () => cleanParams({ region, districtManager, storeId, auditorEmail, dateFrom, dateTo }),
    [region, districtManager, storeId, auditorEmail, dateFrom, dateTo]
  );

  useEffect(() => {
    api.getAuditsReport(filters).then((r) => setAuditsData(r.audits));
    api.getCriteriaReport(filters).then((r) => setCriteriaData(r.criteria));
  }, [filters]);

  useEffect(() => {
    if (!showAggregate) return;
    api.getTrendReport(filters).then(setTrendData);
    api.getBreakdownReport(filters).then(setBreakdownData);
  }, [filters, showAggregate]);

  const regions = [...new Set(stores.map((s) => s.region).filter(Boolean))].sort();
  const districtManagers = [...new Set(stores.filter((s) => !region || s.region === region).map((s) => s.district_manager))].sort();
  const filteredStores = [...stores.filter((s) => (!region || s.region === region) && (!districtManager || s.district_manager === districtManager))].sort((a, b) => a.store_name.localeCompare(b.store_name));

  function resetFilters() {
    setRegion(''); setDistrictManager(''); setStoreId(''); setAuditorEmail(''); setDateFrom(''); setDateTo('');
  }

  function exportAudits() {
    downloadCsv('audit-report.csv', auditsData.map((a) => ({
      Store: a.storeName,
      Region: a.region || '',
      'District Manager': a.districtManager,
      Auditor: a.auditorName,
      Template: a.templateName,
      Started: new Date(a.startedAt).toLocaleString(),
      Completed: new Date(a.completedAt).toLocaleString(),
      Announced: announcedLabel(a.announced),
      'Manager On Shift': a.managerOnShift || '',
      'Score (%)': a.score,
      Notes: a.overallNote || '',
    })));
  }

  function exportCriteria() {
    downloadCsv('criteria-misses.csv', criteriaData.map((c) => ({
      Section: c.section,
      Question: c.question,
      Fails: c.fails,
      'Total Answered': c.total,
      'Fail Rate (%)': c.failRate,
    })));
  }

  return (
    <div>
      <div className="card">
        <h1>Reports</h1>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginTop: 12 }}>
          <select value={region} onChange={(e) => { setRegion(e.target.value); setDistrictManager(''); setStoreId(''); }}>
            <option value="">All regions</option>
            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={districtManager} onChange={(e) => { setDistrictManager(e.target.value); setStoreId(''); }}>
            <option value="">All district managers</option>
            {districtManagers.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            <option value="">All stores</option>
            {filteredStores.map((s) => <option key={s.id} value={s.id}>{s.store_name}</option>)}
          </select>
          <select value={auditorEmail} onChange={(e) => setAuditorEmail(e.target.value)}>
            <option value="">All auditors</option>
            {users.map((u) => <option key={u.id} value={u.email}>{u.display_name}</option>)}
          </select>
          <input type="date" placeholder="From" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <input type="date" placeholder="To" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <button className="ghost" onClick={resetFilters}>Clear filters</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px 0' }}>
          <h2>Audits</h2>
          <button className="ghost small" disabled={!auditsData || auditsData.length === 0} onClick={exportAudits}>Export CSV</button>
        </div>
        {!auditsData && <div style={{ padding: 20, color: 'var(--ink-soft)' }}>Loading...</div>}
        {auditsData && auditsData.length === 0 && <div className="empty-state">No completed audits match these filters yet.</div>}
        {auditsData && auditsData.length > 0 && (
          <table style={{ marginTop: 10 }}>
            <thead>
              <tr><th>Store</th><th>DM</th><th>Auditor</th><th>Completed</th><th>Announced</th><th>Manager on shift</th><th>Score</th></tr>
            </thead>
            <tbody>
              {auditsData.map((a) => (
                <tr key={a.auditId}>
                  <td><Link href={`/audits/${a.auditId}`}>{a.storeName}</Link></td>
                  <td>{a.districtManager}</td>
                  <td>{a.auditorName}</td>
                  <td>{new Date(a.completedAt).toLocaleDateString()}</td>
                  <td>{announcedLabel(a.announced)}</td>
                  <td>{a.managerOnShift || '—'}</td>
                  <td><ScoreRing score={a.score} size={36} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px 0' }}>
          <div>
            <h2>Criteria misses</h2>
            <p style={{ color: 'var(--ink-soft)', fontSize: 13, margin: 0 }}>Same question failing across many stores usually means a training gap or an unrealistic standard — most-missed first.</p>
          </div>
          <button className="ghost small" disabled={!criteriaData || criteriaData.length === 0} onClick={exportCriteria}>Export CSV</button>
        </div>
        {criteriaData && criteriaData.length === 0 && <div className="empty-state">No answered questions match these filters yet.</div>}
        {criteriaData && criteriaData.length > 0 && (
          <table style={{ marginTop: 10 }}>
            <thead><tr><th>Section</th><th>Question</th><th>Fails</th><th>Answered</th><th>Fail rate</th></tr></thead>
            <tbody>
              {criteriaData.slice(0, 30).map((c, i) => (
                <tr key={i}>
                  <td>{c.section}</td>
                  <td>{c.question}</td>
                  <td>{c.fails}</td>
                  <td>{c.total}</td>
                  <td>{c.failRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <button className="ghost" onClick={() => setShowAggregate((s) => !s)}>
        {showAggregate ? 'Hide' : 'Show'} aggregate charts
      </button>

      {showAggregate && trendData && trendData.trend.length > 0 && (
        <>
          <div className="card" style={{ marginTop: 16 }}>
            <h2>Average score by month</h2>
            <div style={{ height: 240, marginTop: 10 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData.trend}>
                  <CartesianGrid stroke="#2a2f3a" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#8b93a3' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#8b93a3' }} />
                  <Tooltip contentStyle={CHART_TOOLTIP} />
                  <Line type="monotone" dataKey="averageScore" stroke="#2dd4bf" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {trendData.byDistrictManager.length > 1 && (
            <div className="card">
              <h2>Average score by district manager</h2>
              <div style={{ height: Math.max(200, trendData.byDistrictManager.length * 36), marginTop: 10 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData.byDistrictManager} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid stroke="#2a2f3a" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: '#8b93a3' }} />
                    <YAxis type="category" dataKey="districtManager" tick={{ fontSize: 12, fill: '#8b93a3' }} width={110} />
                    <Tooltip contentStyle={CHART_TOOLTIP} />
                    <Bar dataKey="averageScore" radius={[0, 4, 4, 0]}>
                      {trendData.byDistrictManager.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {breakdownData && breakdownData.sections.length > 0 && (
            <div className="card">
              <h2>Pass rate by audit category</h2>
              <div style={{ height: Math.max(200, breakdownData.sections.length * 36), marginTop: 10 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={breakdownData.sections} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid stroke="#2a2f3a" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: '#8b93a3' }} />
                    <YAxis type="category" dataKey="section" tick={{ fontSize: 12, fill: '#8b93a3' }} width={140} />
                    <Tooltip formatter={(v, name, props) => [`${v}%`, `pass rate (n=${props.payload.sampleSize})`]} contentStyle={CHART_TOOLTIP} />
                    <Bar dataKey="passRate" radius={[0, 4, 4, 0]}>
                      {breakdownData.sections.map((s, i) => (
                        <Cell key={i} fill={s.passRate >= 90 ? '#3ddc8f' : s.passRate >= 75 ? '#f5b942' : '#ff6b6b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return <AppFrame>{() => <ReportsContent />}</AppFrame>;
}
