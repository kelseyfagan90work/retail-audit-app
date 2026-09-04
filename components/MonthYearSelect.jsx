'use client';

const MONTHS = [
  ['01', 'January'], ['02', 'February'], ['03', 'March'], ['04', 'April'],
  ['05', 'May'], ['06', 'June'], ['07', 'July'], ['08', 'August'],
  ['09', 'September'], ['10', 'October'], ['11', 'November'], ['12', 'December'],
];

// value/onChange work in 'YYYY-MM' strings, same shape a native <input type="month"> uses.
export default function MonthYearSelect({ value, onChange, disabled }) {
  const [year, month] = value ? value.split('-') : ['', ''];
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear + 1; y >= currentYear - 3; y--) years.push(y);

  function update(newYear, newMonth) {
    if (newYear && newMonth) onChange(`${newYear}-${newMonth}`);
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <select value={month} disabled={disabled} onChange={(e) => update(year || String(currentYear), e.target.value)} style={{ flex: 1 }}>
        <option value="">Month</option>
        {MONTHS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
      </select>
      <select value={year} disabled={disabled} onChange={(e) => update(e.target.value, month || '01')} style={{ width: 100 }}>
        <option value="">Year</option>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}
