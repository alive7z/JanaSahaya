import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ThumbsUp, Clock, CheckCircle2, Star } from 'lucide-react';
import StatCard from '../components/common/StatCard';
import { Badge, StatusBadge } from '../components/common/Badge';
import { EmptyState, Spinner } from '../components/common/Button';
import { useToast } from '../components/common/Toast';
import { citizenDashboard } from '../services/dashboard';
import { greetingForHour, timeAgo } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import Illustration from '../components/common/Illustration';

export default function Dashboard() {
  const toast = useToast();
  const { user } = useAuth();
  const [data, setData] = useState(null);

  const load = () => citizenDashboard().then(setData).catch((e) => toast.error(e, 'Failed to load dashboard'));
  useEffect(() => { load(); }, []);

  if (!data) return <Spinner label="Loading your dashboard…" />;

  const s = data.stats || {};
  const recent = data.recentActivity || [];
  const greeting = greetingForHour();

  return (
    <div className="page-shell py-8">
      <section className="relative grid min-h-56 items-center overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-500 px-7 py-8 text-white shadow-soft sm:px-9 lg:grid-cols-[1fr_330px]">
        <div className="absolute -left-20 -top-24 h-56 w-56 rounded-full border-[36px] border-white/10" />
        <div className="relative">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-100">Citizen dashboard</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{greeting}, {user?.full_name?.split(' ')[0] || 'neighbour'}</h1>
          <p className="mt-2 text-lg font-medium text-brand-50">Help make your community better.</p>
          <p className="mt-4 text-sm text-brand-100">
            Your contribution: <span className="inline-flex items-center gap-1 font-semibold text-amber-200"><Star className="h-3.5 w-3.5" /> {s.contributionPoints ?? 0} points</span>
            {data.unreadNotifications > 0 && (
              <Link to="/notifications" className="ml-2 font-semibold text-white hover:underline">
                {data.unreadNotifications} unread notifications →
              </Link>
            )}
          </p>
        </div>
        <Illustration name="citizen-dashboard" alt="Citizen using JanaSahaya in a modern city" eager className="relative ml-auto hidden w-72 lg:block" />
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Issues reported" value={s.issuesReported ?? 0} icon={AlertCircle} to="/issues?tab=my" />
        <StatCard label="Issues supported" value={s.issuesSupported ?? 0} icon={ThumbsUp} to="/issues?tab=voted" />
        <StatCard label="Following" value={s.issuesFollowing ?? 0} icon={Clock} to="/issues?tab=following" />
        <StatCard label="Verified resolutions" value={s.issuesResolved ?? 0} icon={CheckCircle2} />
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Recent activity</h2>
        {!recent.length ? (
          <EmptyState
            illustration="reports-empty"
            title="No reports yet"
            body="Report your first civic issue and track its progress here."
            action={<Link to="/report" className="btn-primary">Report an Issue</Link>}
          />
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
