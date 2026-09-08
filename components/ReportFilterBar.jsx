'use client';

import MonthYearSelect from './MonthYearSelect';

export default function ReportFilterBar({ stores, templates, users, filters, onChange, fields }) {
  const show = (f) => fields.includes(f);
  const districtManagers = [...new Set(stores.map((s) => s.district_manager))].sort();
  const filteredStores = [...stores.filter((s) => !filters.districtManager || s.district_manager === filters.districtManager)]
    .sort((a, b) => a.store_name.localeCompare(b.store_name));

  function set(key, value) {
    const next = { ...filters, [key]: value };
    if (key === 'districtManager') next.storeId = '';
    onChange(next);
  }

  function setMonth(month) {
    const next = { ...filters, month };
    if (month) {
      const [y, m] = month.split('-').map(Number);
      next.dateFrom = `${month}-01`;
      next.dateTo = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
    } else {
      delete next.dateFrom;
      delete next.dateTo;
    }
    onChange(next);
  }

  const hasAnyFilter = Object.values(filters).some((v) => v);

  return (
    <div className="filter-bar">
      {show('districtManager') && (
        <select value={filters.districtManager || ''} onChange={(e) => set('districtManager', e.target.value)}>
          <option value="">All DMs</option>
          {districtManagers.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      )}
      {show('storeId') && (
        <select value={filters.storeId || ''} onChange={(e) => set('storeId', e.target.value)}>
          <option value="">All stores</option>
          {filteredStores.map((s) => <option key={s.id} value={s.id}>{s.store_name}</option>)}
        </select>
      )}
      {show('templateId') && (
        <select value={filters.templateId || ''} onChange={(e) => set('templateId', e.target.value)}>
          <option value="">All audit types</option>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      )}
      {show('auditorEmail') && (
        <select value={filters.auditorEmail || ''} onChange={(e) => set('auditorEmail', e.target.value)}>
          <option value="">All auditors</option>
          {users.map((u) => <option key={u.id} value={u.email}>{u.display_name}</option>)}
        </select>
      )}
      {show('month') && <MonthYearSelect value={filters.month || ''} onChange={setMonth} compact />}
      {show('threshold') && (
        <div className="filter-inline-note">
          Fail rate ≥ <input type="number" min="0" max="100" value={filters.threshold || ''} onChange={(e) => set('threshold', e.target.value)} style={{ width: 52 }} />%
        </div>
      )}
      {hasAnyFilter && <button className="ghost small" onClick={() => onChange({})}>Clear</button>}
    </div>
  );
}
