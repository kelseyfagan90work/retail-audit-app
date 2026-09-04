'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { parseCsvFile, normalizeRows, downloadCsvExample } from '@/lib/csv';

const FIELD_MAP = {
  section: ['Section', 'Section Name', 'section'],
  question: ['Question', 'Question Text', 'question'],
};

const EXAMPLE_CSV = `Section,Question
Front of Store,Windows and entryway are clean and free of clutter
Front of Store,Current promotional signage is displayed correctly
Back of House,Stockroom aisles are clear and organized
Back of House,Safety equipment is accessible and unobstructed`;

export default function TemplateImportPanel() {
  const [templateName, setTemplateName] = useState('');
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);
  const router = useRouter();

  async function handleFile(file) {
    setError(null);
    setFileName(file.name);
    try {
      const raw = await parseCsvFile(file);
      const normalized = normalizeRows(raw, FIELD_MAP);
      setRows(normalized);
    } catch {
      setError('Could not read that file — make sure it is a .csv export.');
    }
  }

  const sectionCount = rows ? new Set(rows.map((r) => r.section)).size : 0;

  async function confirmImport() {
    if (!templateName.trim()) {
      setError('Give the template a name first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.importTemplate({ name: templateName, rows });
      router.push(`/templates/${res.templateId}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Import a template from CSV</h2>
      <p style={{ color: 'var(--ink-soft)', fontSize: 13 }}>
        Two columns: Section and Question. One row per question — rows with the same section get grouped together, in the order they appear.
      </p>
      <button className="ghost small" onClick={() => downloadCsvExample('template-example.csv', EXAMPLE_CSV)}>
        Download example CSV
      </button>

      <div style={{ marginTop: 12 }}>
        <input type="text" placeholder="New template name" value={templateName} onChange={(e) => setTemplateName(e.target.value)} style={{ width: '100%', marginBottom: 10 }} />
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

      {rows && rows.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 6 }}>
            Preview — {sectionCount} section(s), {rows.length} question(s).
          </div>
          <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid var(--line)', borderRadius: 8 }}>
            <table>
              <thead>
                <tr><th>Section</th><th>Question</th></tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((r, i) => (
                  <tr key={i}>
                    <td>{r.section}</td>
                    <td>{r.question}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="primary" style={{ marginTop: 10 }} onClick={confirmImport} disabled={busy}>
            {busy ? 'Creating...' : `Create template with ${rows.length} question(s)`}
          </button>
        </div>
      )}
    </div>
  );
}
