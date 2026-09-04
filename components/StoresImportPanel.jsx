'use client';

import { useRef, useState } from 'react';
import { api } from '@/lib/api';
import { parseCsvFile, normalizeRows, downloadCsvExample } from '@/lib/csv';

const FIELD_MAP = {
  storeNumber: ['Store Number', 'Store #', 'store_number', 'storeNumber'],
  storeName: ['Store Name', 'store_name', 'storeName'],
  district: ['District', 'District Manager', 'district', 'DM'],
  districtManagerEmail: ['District Manager Email', 'DM Email', 'district_manager_email', 'districtManagerEmail'],
  storeManagerName: ['Store Manager Name', 'Manager Name', 'store_manager_name', 'storeManagerName'],
  storeManagerEmail: ['Store Manager Email', 'Manager Email', 'store_manager_email', 'storeManagerEmail'],
};

const EXAMPLE_CSV = `Store Number,Store Name,District,District Manager Email,Store Manager Name,Store Manager Email
0142,Main St,Jamie Rivera,jamie@example.com,Sam Lee,sam@example.com
0187,Riverside,Jamie Rivera,jamie@example.com,Pat Nguyen,pat@example.com
0203,Oak Plaza,Alex Kim,alex@example.com,Chris Park,chris@example.com`;

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
        Columns: Store Number, Store Name, District (your DM's name), District Manager Email, Store Manager Name, Store Manager Email (all but the first three are optional).
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
                <tr><th>Store #</th><th>Name</th><th>District (DM)</th><th>DM Email</th><th>Store Mgr</th><th>Store Mgr Email</th></tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i}>
                    <td>{r.storeNumber}</td>
                    <td>{r.storeName}</td>
                    <td>{r.district}</td>
                    <td>{r.districtManagerEmail}</td>
                    <td>{r.storeManagerName}</td>
                    <td>{r.storeManagerEmail}</td>
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
