import { Link } from 'react-router-dom';
import { AlertTriangle, ThumbsUp } from 'lucide-react';
import { distanceLabel, timeAgo, clsx } from '../../utils/formatters';

export default function DuplicateWarning({ duplicates }) {
  if (!duplicates?.length) return null;
  return (
    <div className="card border-amber-200 bg-amber-50 p-4 ring-amber-200">
      <h3 className="flex items-center gap-2 font-semibold text-amber-800">
        <AlertTriangle className="h-4 w-4" /> Possible duplicate reports nearby
      </h3>
      <p className="mt-1 text-sm text-amber-700">
        Similar issues were already reported nearby. Supporting the existing report instead of creating
        a new one helps keep the platform clean.
      </p>
      <ul className="mt-3 space-y-2">
        {duplicates
          .filter((d) => d.isLikelyDuplicate)
          .slice(0, 3)
          .map((d) => (
            <li key={d.issue.id}>
              <Link
                to={`/issue/${d.issue.id}`}
                className="card flex items-center justify-between gap-3 bg-white p-3 hover:shadow-md"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    #{d.issue.id} · {d.issue.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {distanceLabel(d.distance)} away · {timeAgo(d.issue.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
                    <ThumbsUp className="h-3 w-3" /> {d.issue.vote_count}
                  </span>
                  <span
                    className={clsx(
                      'badge',
                      d.score >= 70 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600',
                    )}
                  >
                    match {d.score}
                  </span>
                </div>
              </Link>
            </li>
          ))}
      </ul>
      <p className="mt-3 text-xs text-amber-700">
        Duplicate score ≥ 70 means a strong match (distance + category + text similarity).
      </p>
    </div>
  );
}