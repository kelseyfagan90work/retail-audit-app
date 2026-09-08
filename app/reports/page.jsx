'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppFrame from '@/components/AppFrame';
import ReportFilterBar from '@/components/ReportFilterBar';
import { api } from '@/lib/api';
import { downloadCsv } from '@/lib/csv';
import ScoreRing from '@/components/ScoreRing';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const LINE_COLORS = ['#2dd4bf', '#8b5cf6', '#f5b942', '#ff6b6b', '#3ddc8f', '#60a5fa', '#f472b6', '#a3a3a3'];
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

// ---------- All Scores ----------
function AllScoresSection({ refData }) {
  const [filters, setFilters] = useState({});
  const [data, setData] = useState(null);

  useEffect(() => {
    api.getMatrixReport(cleanParams(filters)).then(setData);
  }, [filters]);

  function exportMatrix() {
    downloadCsv('all-scores.csv', data.stores.map((s) => {
      const row = { Region: s.region || '', 'District Manager': s.districtManager, Store: s.storeName };
      data.templates.forEach((t) => { row[t] = s.scores[t] != null ? s.scores[t] : ''; });
      return row;
    }));
  }

  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '18px 22px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>All Scores</h2>
            <p style={{ color: 'var(--ink-soft)', fontSize: 13, margin: 0 }}>One row per store, one column per audit type — export and paste straight into your scoring sheet. Best used with a single month selected.</p>
          </div>
          <button className="ghost small" disabled={!data || data.stores.length === 0} onClick={exportMatrix}>Export CSV</button>
        </div>
        <ReportFilterBar {...refData} filters={filters} onChange={setFilters} fields={['region', 'districtManager', 'storeId', 'dateFrom', 'dateTo']} />
      </div>
      {!data && <div style={{ padding: '0 22px 20px', color: 'var(--ink-soft)' }}>Loading...</div>}
      {data && data.stores.length === 0 && <div className="empty-state">No completed audits match these filters yet.</div>}
      {data && data.stores.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr><th>Store</th><th>Region</th><th>DM</th>{data.templates.map((t) => <th key={t}>{t}</th>)}</tr>
            </thead>
            <tbody>
              {data.stores.map((s) => (
                <tr key={s.storeName}>
                  <td>{s.storeName}</td>
                  <td>{s.region || '—'}</td>
                  <td>{s.districtManager}</td>
                  {data.templates.map((t) => <td key={t}>{s.scores[t] != null ? `${Math.round(s.scores[t] * 100)}%` : '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------- Score by audit type, over time ----------
function TemplateTrendSection({ refData }) {
  const [filters, setFilters] = useState({});
  const [trendData, setTrendData] = useState(null);

  useEffect(() => {
    api.getTrendReport(cleanParams(filters)).then(setTrendData);
  }, [filters]);

  const templateNames = trendData ? [...new Set(trendData.templateTrend.map((t) => t.template))].sort() : [];
  const rows = (() => {
    if (!trendData) return [];
    const byMonth = {};
    trendData.templateTrend.forEach((t) => { (byMonth[t.month] ||= { month: t.month })[t.template] = t.averageScore; });
    return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
  })();

  return (
    <div className="card">
      <h2>Score by Audit Type, Over Time</h2>
      <ReportFilterBar {...refData} filters={filters} onChange={setFilters} fields={['region', 'districtManager', 'storeId', 'auditorEmail', 'dateFrom', 'dateTo']} />
      {rows.length === 0 && <div className="empty-state">No completed audits match these filters yet.</div>}
      {rows.length > 0 && (
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows}>
              <CartesianGrid stroke="#2a2f3a" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#8b93a3' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#8b93a3' }} />
              <Tooltip contentStyle={CHART_TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#8b93a3' }} />
              {templateNames.map((name, i) => (
                <Line key={name} type="monotone" dataKey={name} stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ---------- Audits list ----------
function AuditsSection({ refData }) {
  const [filters, setFilters] = useState({});
  const [data, setData] = useState(null);

  useEffect(() => {
    api.getAuditsReport(cleanParams(filters)).then((r) => setData(r.audits));
  }, [filters]);

  function exportAudits() {
    downloadCsv('audit-report.csv', data.map((a) => ({
      Store: a.storeName, Region: a.region || '', 'District Manager': a.districtManager, Auditor: a.auditorName,
      Template: a.templateName, 'Audit Month': a.auditPeriod ? a.auditPeriod.slice(0, 7) : '',
      Started: new Date(a.startedAt).toLocaleString(), Completed: new Date(a.completedAt).toLocaleString(),
      Announced: announcedLabel(a.announced), 'Manager On Shift': a.managerOnShift || '', 'Score (%)': a.score, Notes: a.overallNote || '',
    })));
  }

  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '18px 22px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Audits</h2>
          <button className="ghost small" disabled={!data || data.length === 0} onClick={exportAudits}>Export CSV</button>
        </div>
        <ReportFilterBar {...refData} filters={filters} onChange={setFilters} fields={['region', 'districtManager', 'storeId', 'templateId', 'auditorEmail', 'dateFrom', 'dateTo']} />
      </div>
      {!data && <div style={{ padding: '0 22px 20px', color: 'var(--ink-soft)' }}>Loading...</div>}
      {data && data.length === 0 && <div className="empty-state">No completed audits match these filters yet.</div>}
      {data && data.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr><th>Store</th><th>DM</th><th>Auditor</th><th>Audit Month</th><th>Announced</th><th>Manager on shift</th><th>Score</th></tr>
            </thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.auditId}>
                  <td><Link href={`/audits/${a.auditId}`}>{a.storeName}</Link></td>
                  <td>{a.districtManager}</td>
                  <td>{a.auditorName}</td>
                  <td>{a.auditPeriod ? a.auditPeriod.slice(0, 7) : new Date(a.completedAt).toLocaleDateString()}</td>
                  <td>{announcedLabel(a.announced)}</td>
                  <td>{a.managerOnShift || '—'}</td>
                  <td><ScoreRing score={a.score} size={36} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------- Criteria misses ----------
function CriteriaMissesSection({ refData }) {
  const [filters, setFilters] = useState({});
  const [all, setAll] = useState(null);

  useEffect(() => {
    const { threshold, ...apiFilters } = filters;
    api.getCriteriaReport(cleanParams(apiFilters)).then((r) => setAll(r.criteria));
    // eslint-disable-next-line
  }, [filters.region, filters.districtManager, filters.storeId, filters.templateId, filters.auditorEmail, filters.dateFrom, filters.dateTo]);

  const hasOtherFilters = ['region', 'districtManager', 'storeId', 'templateId', 'auditorEmail', 'dateFrom', 'dateTo'].some((k) => filters[k]);
  const threshold = filters.threshold ? Number(filters.threshold) : null;

  let shown = all || [];
  let mode = 'top5';
  if (threshold != null) {
    shown = shown.filter((c) => c.failRate >= threshold);
    mode = 'threshold';
  } else if (hasOtherFilters) {
    shown = shown.slice(0, 30);
    mode = 'filtered';
  } else {
    shown = shown.slice(0, 5);
    mode = 'top5';
  }

  function exportCriteria() {
    downloadCsv('criteria-misses.csv', shown.map((c) => ({
      'Audit Type': c.templateName, Section: c.section, Question: c.question, Fails: c.fails, 'Total Answered': c.total, 'Fail Rate (%)': c.failRate,
    })));
  }

  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '18px 22px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Criteria Misses</h2>
            <p style={{ color: 'var(--ink-soft)', fontSize: 13, margin: 0 }}>
              {mode === 'top5' && 'Top 5 most-missed criteria across everything. Filter or set a fail-rate threshold to see more.'}
              {mode === 'threshold' && `Criteria failing ${threshold}% of the time or more.`}
              {mode === 'filtered' && 'Same question failing across many stores usually means a training gap or an unrealistic standard — most-missed first.'}
            </p>
          </div>
          <button className="ghost small" disabled={shown.length === 0} onClick={exportCriteria}>Export CSV</button>
        </div>
        <ReportFilterBar {...refData} filters={filters} onChange={setFilters} fields={['region', 'districtManager', 'storeId', 'templateId', 'auditorEmail', 'dateFrom', 'dateTo', 'threshold']} />
      </div>
      {!all && <div style={{ padding: '0 22px 20px', color: 'var(--ink-soft)' }}>Loading...</div>}
      {all && shown.length === 0 && <div className="empty-state">No answered questions match these filters yet.</div>}
      {shown.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Audit Type</th><th>Section</th><th>Question</th><th>Fails</th><th>Answered</th><th>Fail Rate</th></tr></thead>
            <tbody>
              {shown.map((c, i) => (
                <tr key={i}>
                  <td>{c.templateName}</td>
                  <td>{c.section}</td>
                  <td>{c.question}</td>
                  <td>{c.fails}</td>
                  <td>{c.total}</td>
                  <td>{c.failRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------- Aggregate charts (toggle) ----------
function AggregateSection({ refData }) {
  const [show, setShow] = useState(false);
  const [filters, setFilters] = useState({});
  const [trendData, setTrendData] = useState(null);
  const [breakdownData, setBreakdownData] = useState(null);

  useEffect(() => {
    if (!show) return;
    api.getTrendReport(cleanParams(filters)).then(setTrendData);
    api.getBreakdownReport(cleanParams(filters)).then(setBreakdownData);
  }, [show, filters]);

  return (
    <div>
      <button className="ghost" onClick={() => setShow((s) => !s)}>{show ? 'Hide' : 'Show'} Aggregate Charts</button>

      {show && (
        <>
          <div className="card" style={{ marginTop: 16 }}>
            <ReportFilterBar {...refData} filters={filters} onChange={setFilters} fields={['region', 'districtManager', 'storeId', 'templateId', 'auditorEmail', 'dateFrom', 'dateTo']} />
          </div>

          {trendData && trendData.trend.length > 0 && (
            <div className="card">
              <h2>Overall Average Score by Month</h2>
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
          )}

          {trendData && trendData.byDistrictManager.length > 1 && (
            <div className="card">
              <h2>Average Score by District Manager</h2>
              <div style={{ height: Math.max(200, trendData.byDistrictManager.length * 36), marginTop: 10 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData.byDistrictManager} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid stroke="#2a2f3a" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: '#8b93a3' }} />
                    <YAxis type="category" dataKey="districtManager" tick={{ fontSize: 12, fill: '#8b93a3' }} width={110} />
                    <Tooltip contentStyle={CHART_TOOLTIP} />
                    <Bar dataKey="averageScore" radius={[0, 4, 4, 0]}>
                      {trendData.byDistrictManager.map((_, i) => <Cell key={i} fill={LINE_COLORS[i % LINE_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {breakdownData && breakdownData.sections.length > 0 && (
            <div className="card">
              <h2>Pass Rate by Audit Category</h2>
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

function ReportsContent() {
  const [stores, setStores] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.getStores().then(setStores);
    api.getTemplates().then(setTemplates);
    api.getUsers().then(setUsers);
  }, []);

  const refData = { stores, templates, users };

  return (
    <div>
      <div className="card">
        <h1>Reports</h1>
        <p style={{ color: 'var(--ink-soft)', margin: 0 }}>Each section below filters independently.</p>
      </div>

      <AllScoresSection refData={refData} />
      <TemplateTrendSection refData={refData} />
      <AuditsSection refData={refData} />
      <CriteriaMissesSection refData={refData} />
      <AggregateSection refData={refData} />
    </div>
  );
}

export default function ReportsPage() {
  return <AppFrame>{() => <ReportsContent />}</AppFrame>;
}
