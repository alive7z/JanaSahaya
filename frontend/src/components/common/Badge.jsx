import { STATUS_META, PRIORITY_META } from '../../constants';
import { clsx, formatLabel } from '../../utils/formatters';

export function StatusBadge({ status }) {
  const meta = STATUS_META[status];
  if (!meta) return <span className="badge bg-slate-100 text-slate-600">{formatLabel(status)}</span>;
  return <span className={`badge ${meta.classes}`}>{meta.label}</span>;
}

export function PriorityBadge({ priority }) {
  const meta = PRIORITY_META[priority];
  if (!meta) return <span className="badge bg-slate-100 text-slate-600">{formatLabel(priority)}</span>;
  return <span className={`badge ${meta.classes}`}>{meta.label}</span>;
}

const COLORS = {
  slate: 'bg-slate-100 text-slate-600',
  brand: 'bg-brand-100 text-brand-700',
  green: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-800',
  rose: 'bg-rose-100 text-rose-800',
  sky: 'bg-sky-100 text-sky-800',
};

export function Badge({ color = 'slate', children, className }) {
  return <span className={clsx('badge', className ? className : COLORS[color])}>{children}</span>;
}

export function Pill({ children, className }) {
  return <span className={clsx('badge bg-slate-100 text-slate-600', className)}>{children}</span>;
}
