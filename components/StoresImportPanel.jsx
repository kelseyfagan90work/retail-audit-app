'use client';

import { useRef, useState } from 'react';
import { api } from '@/lib/api';
import { parseCsvFile, normalizeRows, downloadCsvExample } from '@/lib/csv';

const FIELD_MAP = {
  storeNumber: ['Store Number', 'Store #', 'store_number', 'storeNumber'],
  storeName: ['Store Name', 'store_name', 'storeName'],
  region: ['Region', 'region'],
  districtManager: ['District Manager', 'District', 'district_manager', 'districtManager', 'DM'],
  districtManagerEmail: ['District Manager Email', 'DM Email', 'district_manager_email', 'districtManagerEmail'],
  storeEmail: ['Store Email', 'store_email', 'storeEmail'],
};

const EXAMPLE_CSV = `Store Number,Store Name,Region,District Manager,District Manager Email,Store Email
0142,Main St,Northeast,Jamie Rivera,jamie@example.com,store142@example.com
0187,Riverside,Northeast,Jamie Rivera,jamie@example.com,store187@example.com
0203,Oak Plaza,Southeast,Alex Kim,alex@example.com,store203@example.com`;

export default function StoresImportPanel({ onImported }) {
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);

  async function handleFile(file) {
    setError(null);
    setResult(null);
    setFileName(file.name);
    try {
      const raw = await parseCsvFile(file);
      const normalized = normalizeRows(raw, FIELD_MAP);
      setRows(normalized);
    } catch (e) {
      setError('Could not read that file — make sure it is a .csv export.');
    }
  }

  async function confirmImport() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.importStores(rows);
      setResult(res);
      setRows(null);
      onImported?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Import stores from CSV</h2>
      <p style={{ color: 'var(--ink-soft)', fontSize: 13 }}>
        Columns: Store Number, Store Name, Region, District Manager, District Manager Email, Store Email (Region and the two emails are optional).
        Re-uploading later updates existing stores by Store Number instead of duplicating them.
      </p>
      <button className="ghost small" onClick={() => downloadCsvExample('stores-example.csv', EXAMPLE_CSV)}>
        Download example CSV
      </button>

      <div style={{ marginTop: 12 }}>
        <input
          ref={fileInput}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
        />
        <button className="ghost" onClick={() => fileInput.current.click()}>Choose CSV file...</button>
        {fileName && <span style={{ marginLeft: 10, fontSize: 13, color: 'var(--ink-soft)' }}>{fileName}</span>}
      </div>

      {error && <div style={{ color: 'var(--rejected)', marginTop: 10 }}>{error}</div>}
      {result && (
        <div style={{ color: 'var(--approved)', marginTop: 10, fontSize: 13 }}>
          Imported {result.imported} store(s).
          {result.skipped.length > 0 && ` Skipped ${result.skipped.length} row(s) missing required fields.`}
        </div>
      )}

      {rows && rows.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 6 }}>
            Preview — {rows.length} row(s) found. Check this looks right before importing.
          </div>
          <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid var(--line)', borderRadius: 8 }}>
            <table>
              <thead>
                <tr><th>Store #</th><th>Name</th><th>Region</th><th>District Manager</th><th>DM Email</th><th>Store Email</th></tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i}>
                    <td>{r.storeNumber}</td>
                    <td>{r.storeName}</td>
                    <td>{r.region}</td>
                    <td>{r.districtManager}</td>
                    <td>{r.districtManagerEmail}</td>
                    <td>{r.storeEmail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="primary" style={{ marginTop: 10 }} onClick={confirmImport} disabled={busy}>
            {busy ? 'Importing...' : `Import ${rows.length} store(s)`}
          </button>
        </div>
      )}
    </div>
  );
}
