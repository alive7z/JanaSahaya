import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Plus, ArrowRight, CheckCircle2, Shield, Users } from 'lucide-react';
import IssueCard from '../components/issues/IssueCard';
import { Spinner } from '../components/common/Button';
import { fetchIssues } from '../services/issues';
import { useAuth } from '../context/AuthContext';

const HOW_IT_WORKS = [
  {
    title: 'Report',
    body: 'Snap a photo, pin the exact location and describe the problem in under a minute.',
  },
  {
    title: 'Support',
    body: 'Vote on existing reports instead of duplicating them — strength in numbers.',
  },
  {
    title: 'Track',
    body: 'Watch the lifecycle from submission to verified resolution on the timeline.',
  },
  {
    title: 'Resolve',
    body: 'Authorities get an SLA deadline; citizens confirm the fix actually happened.',
  },
];

export default function Home() {
  const [recent, setRecent] = useState(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    fetchIssues({ page: 1, limit: 4, sort: 'newest' })
      .then(setRecent)
      .catch(() => setRecent({ issues: [] }));
  }, []);

  return (
    <div>
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
              Report civic issues.
              <br />
              Track them to resolved.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-slate-600">
              CrowdSourced Civic Issues connects citizens and city departments. Report potholes,
              garbage, streetlight failures and more — then watch the problem get fixed, with deadlines
              and proof.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={isAuthenticated ? '/report' : '/auth?mode=register'} className="btn-primary">
                <Plus className="h-4 w-4" /> Report an issue
              </Link>
              <Link to="/issues" className="btn-secondary">
                Explore issues <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
              <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Duplicate detection</li>
              <li className="inline-flex items-center gap-2"><Shield className="h-4 w-4 text-brand-600" /> SLA + escalation</li>
              <li className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-brand-600" /> Citizen verification</li>
            </ul>
          </div>

          <div className="card hidden items-center justify-center p-8 md:flex">
            <div className="flex h-full min-h-[320px] w-full flex-col items-center justify-center gap-4 rounded-xl bg-slate-50 text-center">
              <MapPin className="h-12 w-12 text-brand-600" />
              <p className="max-w-xs text-sm text-slate-500">
                Your city’s problems, mapped, prioritized and tracked in real time on the{' '}
                <Link to="/map" className="font-medium text-brand-600 hover:underline">live map</Link>.
              </p>
              <Link to="/map" className="btn-secondary">
                Open map <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="text-2xl font-bold text-slate-900">How it works</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((s, i) => (
            <div key={s.title} className="card p-5">
              <span className="text-3xl font-extrabold text-brand-100">{i + 1}</span>
              <h3 className="mt-2 font-semibold text-slate-800">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Recent issues</h2>
            <Link to="/issues" className="text-sm font-medium text-brand-600 hover:underline">
              View all →
            </Link>
          </div>
          {!recent ? (
            <Spinner />
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {recent.issues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="card bg-gradient-to-r from-brand-600 to-brand-700 p-8 text-white md:p-12">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold">See a problem? Make it visible.</h2>
              <p className="mt-2 max-w-lg text-brand-100">
                Every report is routed to the right department, scored by priority and tracked to a
                verifiable resolution.
              </p>
            </div>
            <Link to="/report" className="btn bg-white !px-6 !py-3 font-semibold text-brand-700 hover:bg-brand-50">
              Report now
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}