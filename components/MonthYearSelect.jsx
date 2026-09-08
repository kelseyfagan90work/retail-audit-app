'use client';

const MONTHS = [
  ['01', 'January'], ['02', 'February'], ['03', 'March'], ['04', 'April'],
  ['05', 'May'], ['06', 'June'], ['07', 'July'], ['08', 'August'],
  ['09', 'September'], ['10', 'October'], ['11', 'November'], ['12', 'December'],
];
const MONTHS_SHORT = [
  ['01', 'Jan'], ['02', 'Feb'], ['03', 'Mar'], ['04', 'Apr'], ['05', 'May'], ['06', 'Jun'],
  ['07', 'Jul'], ['08', 'Aug'], ['09', 'Sep'], ['10', 'Oct'], ['11', 'Nov'], ['12', 'Dec'],
];

// value/onChange work in 'YYYY-MM' strings, same shape a native <input type="month"> uses.
export default function MonthYearSelect({ value, onChange, disabled, compact = false }) {
  const [year, month] = value ? value.split('-') : ['', ''];
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear + 1; y >= currentYear - 3; y--) years.push(y);
  const monthOptions = compact ? MONTHS_SHORT : MONTHS;

  function update(newYear, newMonth) {
    if (newYear && newMonth) onChange(`${newYear}-${newMonth}`);
  }

  return (
    <div className={compact ? 'month-year-select compact' : 'month-year-select'}>
      <select value={month} disabled={disabled} onChange={(e) => update(year || String(currentYear), e.target.value)} style={{ width: compact ? 66 : undefined, flex: compact ? undefined : 1 }}>
        <option value="">Month</option>
        {monthOptions.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
      </select>
      <select value={year} disabled={disabled} onChange={(e) => update(e.target.value, month || '01')} style={{ width: compact ? 74 : 100 }}>
        <option value="">Year</option>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}
