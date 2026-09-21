import { Info } from 'lucide-react';
import { PRIORITY_META } from '../../constants';
import { PriorityBadge } from '../common/Badge';

export default function PriorityExplanation({ score, priority, reasons }) {
  const reasonsValid = Array.isArray(reasons) ? reasons : [];
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-slate-800">
          <Info className="h-4 w-4 text-brand-600" /> Priority explanation
        </h3>
        <div className="flex items-center gap-2">
          <PriorityBadge priority={priority} />
          <span className="text-xs text-slate-500">score {score ?? '—'}/100</span>
        </div>
      </div>

      <div className="space-y-2">
        {reasonsValid.length === 0 && (
          <p className="text-sm text-slate-500">No contributing factors were scored for this issue.</p>
        )}
        {reasonsValid.map((r, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="flex items-center gap-2 text-slate-700">
              <span className="h-2 w-2 rounded-full bg-brand-500" />
              {r.label}
            </span>
            <span className="font-mono text-xs font-semibold text-brand-700">+{r.points}</span>
          </div>
        ))}
      </div>

      {priority && (
        <p className="mt-3 text-xs text-slate-500">
          Priority bands: 0–29 Low · 30–49 Medium · 50–74 High · 75+ Critical
        </p>
      )}
    </div>
  );
}