'use client';

import { useEffect, useState } from 'react';
import AppFrame from '@/components/AppFrame';
import { api } from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function ReportsContent() {
  const [district, setDistrict] = useState('');
  const [stores, setStores] = useState([]);
  const [data, setData] = useState(null);

  useEffect(() => { api.getStores().then(setStores); }, []);
  useEffect(() => {
    api.getTrendReport(district ? { district } : {}).then(setData);
  }, [district]);

  const districts = [...new Set(stores.map((s) => s.district))].sort();

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Reports</h1>
          <select value={district} onChange={(e) => setDistrict(e.target.value)}>
            <option value="">All districts</option>
            {districts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {!data && <div className="card">Loading...</div>}

      {data && data.trend.length === 0 && (
        <div className="card empty-state">No completed audits yet — trends will show up here once audits are finished.</div>
      )}

      {data && data.trend.length > 0 && (
        <>
          <div className="card">
            <h2>Average score by month</h2>
            <div style={{ height: 260, marginTop: 10 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trend}>
                  <CartesianGrid stroke="#e2ded4" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="averageScore" stroke="#0f5c4d" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {data.storeComparison.length > 0 && (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '16px 20px 0' }}>
                <h2>{data.prevMonth} → {data.lastMonth}</h2>
              </div>
              <table>
                <thead>
                  <tr><th>Store</th><th>District</th><th>{data.prevMonth}</th><th>{data.lastMonth}</th><th>Change</th></tr>
                </thead>
                <tbody>
                  {data.storeComparison.map((s) => (
                    <tr key={s.storeNumber}>
                      <td>{s.storeNumber} — {s.storeName}</td>
                      <td>{s.district}</td>
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
