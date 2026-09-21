import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export default function StatCard({ label, value, icon: Icon, delta, hint, to }) {
  const DeltaIcon = delta == null ? null : delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  const inner = (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        {Icon && <span className="rounded-lg bg-brand-50 p-2 text-brand-600"><Icon className="h-5 w-5" /></span>}
      </div>
      {(delta != null || hint) && (
        <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
          {DeltaIcon && (
            <span className={delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-rose-600' : 'text-slate-400'}>
              <DeltaIcon className="h-3.5 w-3.5" />
            </span>
          )}
          {hint}
        </p>
      )}
    </div>
  );

  return to ? <Link to={to} className="block transition hover:-translate-y-0.5">{inner}</Link> : inner;
}