import Papa from 'papaparse';

// Parses a File into an array of row objects keyed by (trimmed, case-insensitive-matched) header.
export function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => resolve(results.data),
      error: (err) => reject(err),
    });
  });
}

// Maps a parsed CSV row's headers (which vary a lot in the wild — "Store #",
// "store_number", "Store Number") onto the canonical field names our API
// expects, using a fieldMap of { canonicalName: [accepted header variants] }.
export function normalizeRows(rows, fieldMap) {
  const key = (s) => s.toLowerCase().replace(/[\s_#-]/g, '');
  const lookup = {};
  Object.entries(fieldMap).forEach(([canonical, variants]) => {
    variants.forEach((v) => { lookup[key(v)] = canonical; });
  });

  return rows.map((row) => {
    const out = {};
    Object.entries(row).forEach(([header, value]) => {
      const canonical = lookup[key(header)];
      if (canonical) out[canonical] = value;
    });
    return out;
  });
}

// Triggers a client-side download of a small CSV string — used for the
// "download example" links so people know the expected column format.
export function downloadCsvExample(filename, content) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
