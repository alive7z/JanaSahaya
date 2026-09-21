import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ThumbsUp, Clock, CheckCircle2, Star } from 'lucide-react';
import StatCard from '../components/common/StatCard';
import { Badge, StatusBadge } from '../components/common/Badge';
import { EmptyState, Spinner } from '../components/common/Button';
import { useToast } from '../components/common/Toast';
import { citizenDashboard } from '../services/dashboard';
import { timeAgo } from '../utils/formatters';

export default function Dashboard() {
  const toast = useToast();
  const [data, setData] = useState(null);

  const load = () => citizenDashboard().then(setData).catch((e) => toast.error(e, 'Failed to load dashboard'));
  useEffect(() => { load(); }, []);

  if (!data) return <Spinner label="Loading your dashboard…" />;

  const s = data.stats || {};
  const recent = data.recentActivity || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            Your contribution: <span className="inline-flex items-center gap-1 font-medium text-amber-600"><Star className="h-3.5 w-3.5" /> {s.contributionPoints ?? 0} points</span>
            {data.unreadNotifications > 0 && (
              <Link to="/notifications" className="ml-2 text-brand-600 hover:underline">
                {data.unreadNotifications} unread notifications →
              </Link>
            )}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Issues reported" value={s.issuesReported ?? 0} icon={AlertCircle} to="/issues?tab=my" />
        <StatCard label="Issues supported" value={s.issuesSupported ?? 0} icon={ThumbsUp} to="/issues?tab=voted" />
        <StatCard label="Following" value={s.issuesFollowing ?? 0} icon={Clock} to="/issues?tab=following" />
        <StatCard label="Verified resolutions" value={s.issuesResolved ?? 0} icon={CheckCircle2} />
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Recent activity</h2>
        {!recent.length ? (
          <EmptyState title="No activity yet" body="Report or support an issue to see activity here." />
        ) : (
          <ul className="card divide-y divide-slate-100">
            {recent.map((a, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-700">{a.title}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <StatusBadge status={a.from_status} />
                    <span aria-hidden>→</span>
                    <StatusBadge status={a.to_status} />
                    <span aria-hidden>·</span>
                    <span>{timeAgo(a.created_at)}</span>
                  </div>
                </div>
                <Link to={`/issue/${a.issue_id}`} className="shrink-0 text-sm font-medium text-brand-600 hover:underline">
                  Open →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      {toast.node}
    </div>
  );
}