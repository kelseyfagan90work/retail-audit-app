'use client';

import { useEffect, useMemo, useState } from 'react';
import AppFrame from '@/components/AppFrame';
import { api } from '@/lib/api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const BAR_COLORS = ['#0f5c4d', '#1d7a3c', '#b8860f', '#b23a34', '#57616e'];

function cleanParams(obj) {
  const out = {};
  Object.entries(obj).forEach(([k, v]) => { if (v) out[k] = v; });
  return out;
}

function ReportsContent() {
  const [stores, setStores] = useState([]);
  const [region, setRegion] = useState('');
  const [districtManager, setDistrictManager] = useState('');
  const [storeId, setStoreId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [trendData, setTrendData] = useState(null);
  const [breakdownData, setBreakdownData] = useState(null);

  useEffect(() => { api.getStores().then(setStores); }, []);

  const filters = useMemo(() => cleanParams({ region, districtManager, storeId, dateFrom, dateTo }), [region, districtManager, storeId, dateFrom, dateTo]);

  useEffect(() => {
    api.getTrendReport(filters).then(setTrendData);
    api.getBreakdownReport(filters).then(setBreakdownData);
  }, [filters]);

  const regions = [...new Set(stores.map((s) => s.region).filter(Boolean))].sort();
  const districtManagers = [...new Set(stores.filter((s) => !region || s.region === region).map((s) => s.district_manager))].sort();
  const filteredStores = stores.filter((s) => (!region || s.region === region) && (!districtManager || s.district_manager === districtManager));

  function resetFilters() {
    setRegion(''); setDistrictManager(''); setStoreId(''); setDateFrom(''); setDateTo('');
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
            {filteredStores.map((s) => <option key={s.id} value={s.id}>{s.store_number} — {s.store_name}</option>)}
          </select>
          <input type="date" placeholder="From" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <input type="date" placeholder="To" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <button className="ghost" onClick={resetFilters}>Clear filters</button>
        </div>
      </div>

      {trendData && trendData.trend.length === 0 && (
        <div className="card empty-state">No completed audits match these filters yet.</div>
      )}

      {trendData && trendData.trend.length > 0 && (
        <>
          <div className="card">
            <h2>Average score by month</h2>
            <div style={{ height: 240, marginTop: 10 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData.trend}>
                  <CartesianGrid stroke="#e2ded4" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="averageScore" stroke="#0f5c4d" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {trendData.byDistrictManager.length > 1 && (
            <div className="card">
              <h2>Average score by district manager</h2>
              <p style={{ color: 'var(--ink-soft)', fontSize: 13 }}>Across the full filtered date range.</p>
              <div style={{ height: Math.max(200, trendData.byDistrictManager.length * 36), marginTop: 10 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData.byDistrictManager} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid stroke="#e2ded4" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="districtManager" tick={{ fontSize: 12 }} width={110} />
                    <Tooltip />
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
              <p style={{ color: 'var(--ink-soft)', fontSize: 13 }}>Weakest areas first — where questions are failing most often.</p>
              <div style={{ height: Math.max(200, breakdownData.sections.length * 36), marginTop: 10 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={breakdownData.sections} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid stroke="#e2ded4" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="section" tick={{ fontSize: 12 }} width={140} />
                    <Tooltip formatter={(v, name, props) => [`${v}%`, `pass rate (n=${props.payload.sampleSize})`]} />
                    <Bar dataKey="passRate" radius={[0, 4, 4, 0]}>
                      {breakdownData.sections.map((s, i) => (
                        <Cell key={i} fill={s.passRate >= 90 ? '#1d7a3c' : s.passRate >= 75 ? '#b8860f' : '#b23a34'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {trendData.storeComparison.length > 0 && (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '16px 20px 0' }}>
                <h2>{trendData.prevMonth} → {trendData.lastMonth}</h2>
              </div>
              <table>
                <thead>
                  <tr><th>Store</th><th>DM</th><th>{trendData.prevMonth}</th><th>{trendData.lastMonth}</th><th>Change</th></tr>
                </thead>
                <tbody>
                  {trendData.storeComparison.map((s) => (
                    <tr key={s.storeNumber}>
                      <td>{s.storeNumber} — {s.storeName}</td>
                      <td>{s.districtManager}</td>
                      <td>{s.previousScore != null ? `${s.previousScore}%` : '—'}</td>
                      <td>{s.currentScore != null ? `${s.currentScore}%` : '—'}</td>
                      <td className={s.change > 0 ? 'trend-up' : s.change < 0 ? 'trend-down' : ''}>
                        {s.change == null ? '—' : `${s.change > 0 ? '+' : ''}${s.change}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
