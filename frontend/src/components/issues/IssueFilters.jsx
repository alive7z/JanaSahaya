import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { STATUS_ORDER, STATUS_META, SORT_OPTIONS, PRIORITY_META } from '../../constants';
import { Button } from '../common/Button';

export default function IssueFilters({ categories, departments, initial = {}, onChange }) {
  const [status, setStatus] = useState(initial.status || '');
  const [categoryId, setCategoryId] = useState(initial.categoryId || '');
  const [priority, setPriority] = useState(initial.priority || '');
  const [departmentId, setDepartmentId] = useState(initial.departmentId || '');
  const [sort, setSort] = useState(initial.sort || 'newest');
  const [search, setSearch] = useState(initial.search || '');
  const [advanced, setAdvanced] = useState(false);

  const push = () => {
    onChange({
      status: status || undefined,
      category_id: categoryId || undefined,
      priority: priority || undefined,
      department_id: departmentId || undefined,
      sort,
      search: search.trim() || undefined,
    });
  };

  useEffect(() => {
    const t = setTimeout(push, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sort]);

  const submit = (e) => {
    if (e) e.preventDefault();
    push();
  };

  const clearAll = () => {
    setStatus('');
    setCategoryId('');
    setPriority('');
    setDepartmentId('');
    setSearch('');
    setSort('newest');
    onChange({});
  };

  const hasFilters = status || categoryId || priority || departmentId;

  return (
    <form onSubmit={submit} className="card space-y-3 p-4">
      <div className="flex items-center gap-2">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search title, description, location, #id…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <Button type="submit">Search</Button>
        {hasFilters && (
          <button type="button" onClick={clearAll} className="btn-secondary p-2" aria-label="Clear filters">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">Any priority</option>
          {Object.entries(PRIORITY_META).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {(categories || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setAdvanced((a) => !a)}
          className="btn-secondary"
          aria-expanded={advanced}
        >
          <SlidersHorizontal className="h-4 w-4" /> More
        </button>
        {!hasFilters && <span className="text-xs text-slate-400">Filters also update as you type</span>}
      </div>

      {advanced && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <select className="input w-auto" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">All departments</option>
            {(departments || []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          {hasFilters && (
            <Button type="submit" variant="secondary">
              Apply filters
            </Button>
          )}
        </div>
      )}
    </form>
  );
}