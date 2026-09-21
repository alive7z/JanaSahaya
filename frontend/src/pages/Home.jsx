import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Camera, CheckCircle2, Construction, Droplets, LampDesk, MapPinned,
  Route, ShieldCheck, Trash2, Waves, Wrench,
} from 'lucide-react';
import Illustration from '../components/common/Illustration';
import IssueCard from '../components/issues/IssueCard';
import { EmptyState, Spinner } from '../components/common/Button';
import { fetchIssues } from '../services/issues';
import { useAuth } from '../context/AuthContext';

const STEPS = [
  { title: 'Report', body: 'Share a photo, category and exact location in just a few taps.', icon: Camera },
  { title: 'Track', body: 'Follow verification, assignment and progress with timely updates.', icon: MapPinned },
  { title: 'Resolve', body: 'Authorities act, share proof and close the loop with citizens.', icon: CheckCircle2 },
];

const CATEGORIES = [
  { title: 'Potholes', body: 'Unsafe road damage and surface hazards.', icon: Construction, tone: 'bg-amber-50 text-amber-700' },
  { title: 'Garbage', body: 'Waste collection and illegal dumping.', icon: Trash2, tone: 'bg-emerald-50 text-emerald-700' },
  { title: 'Street Lights', body: 'Broken or unlit public lighting.', icon: LampDesk, tone: 'bg-indigo-50 text-indigo-700' },
  { title: 'Water Leakage', body: 'Pipe leaks and water supply issues.', icon: Droplets, tone: 'bg-cyan-50 text-cyan-700' },
  { title: 'Drainage', body: 'Blocked drains and waterlogging.', icon: Waves, tone: 'bg-blue-50 text-blue-700' },
  { title: 'Roads', body: 'Damaged roads, signs and crossings.', icon: Route, tone: 'bg-orange-50 text-orange-700' },
  { title: 'Public Safety', body: 'Hazards that need urgent attention.', icon: ShieldCheck, tone: 'bg-rose-50 text-rose-700' },
  { title: 'Other Civic Issues', body: 'Anything else affecting your area.', icon: Wrench, tone: 'bg-violet-50 text-violet-700' },
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
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-white via-brand-50/80 to-white">
        <div className="absolute -left-24 top-24 -z-10 h-72 w-72 rounded-full bg-brand-100/50 blur-3xl" />
        <div className="absolute right-0 top-0 -z-10 h-72 w-72 opacity-50 dot-pattern" />
        <div className="page-shell grid min-h-[650px] items-center gap-10 py-14 lg:grid-cols-[0.92fr_1.08fr] lg:py-20">
          <div className="reveal max-w-2xl">
            <span className="section-kicker"> Citizen-powered change</span>
            <h1 className="mt-6 text-5xl font-black leading-[1.05] tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl">
              Jana<span className="text-brand-600">Setu</span>
            </h1>
            <p className="mt-4 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
              Your Voice. Your City. Better Together.
            </p>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Report civic issues, track their resolution, and help build a cleaner, safer and more responsive community.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to={isAuthenticated ? '/report' : '/auth?mode=register'} className="btn-primary !px-6 !py-3.5">
                Report an Issue <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/issues" className="btn-secondary !px-6 !py-3.5">Explore JanaSetu</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-600">
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Transparent tracking</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-600" /> Verified resolution</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-2xl lg:max-w-none">
            <div className="absolute inset-x-12 bottom-6 h-20 rounded-[50%] bg-brand-200/40 blur-2xl" />
            <Illustration name="hero" alt="Citizen reporting a civic issue in a clean modern city" eager className="illustration-float relative w-full" />
          </div>
        </div>
      </section>

      <section className="page-shell py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="section-kicker">Simple by design</span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">How JanaSetu works</h2>
          <p className="mt-3 text-slate-600">A clear path from a citizen report to an accountable resolution.</p>
        </div>
        <div className="relative mt-10 grid gap-5 md:grid-cols-3">
          <div className="absolute left-[18%] right-[18%] top-12 hidden border-t-2 border-dashed border-brand-200 md:block" />
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <article key={step.title} className="card reveal relative p-6 text-center transition duration-300 hover:-translate-y-1 hover:shadow-soft">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-8 ring-white"><Icon className="h-7 w-7" /></span>
                <span className="mt-5 block text-xs font-extrabold uppercase tracking-[0.2em] text-brand-500">Step {index + 1}</span>
                <h3 className="mt-2 text-xl font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-brand-100/80 bg-white py-16 sm:py-20">
        <div className="page-shell">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="section-kicker">Civic services</span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950">What can you report?</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate-600">Choose the closest category. JanaSetu routes your report to the responsible department.</p>
          </div>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map(({ title, body, icon: Icon, tone }) => (
              <article key={title} className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-soft">
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}><Icon className="h-6 w-6" /></span>
                <h3 className="mt-4 font-bold text-slate-900 group-hover:text-brand-700">{title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-500">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-shell py-16 sm:py-20">
        <div className="flex items-center justify-between gap-4">
          <div><span className="section-kicker">Community pulse</span><h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950">Recent issues</h2></div>
          <Link to="/issues" className="btn-secondary">View all <ArrowRight className="h-4 w-4" /></Link>
        </div>
        {!recent ? <Spinner /> : recent.issues.length ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{recent.issues.map((issue) => <IssueCard key={issue.id} issue={issue} />)}</div>
        ) : (
          <div className="mt-8"><EmptyState compact illustration="reports-empty" title="No community reports yet" body="Be the first to make an issue visible in your neighbourhood." /></div>
        )}
      </section>

      <section className="page-shell pb-16 sm:pb-20">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-700 to-brand-500 px-7 py-10 text-white shadow-soft sm:px-12 sm:py-12">
          <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border-[38px] border-white/10" />
          <div className="relative flex flex-col items-start justify-between gap-7 md:flex-row md:items-center">
            <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-100">Build a better neighbourhood</p><h2 className="mt-3 text-3xl font-extrabold">See a problem? Make it visible.</h2><p className="mt-3 max-w-2xl leading-7 text-brand-50">Every useful report helps civic teams respond with better context, clearer priorities and public accountability.</p></div>
            <Link to={isAuthenticated ? '/report' : '/auth?mode=register'} className="btn bg-white !px-6 !py-3 text-brand-700 shadow-xl hover:-translate-y-0.5 hover:bg-brand-50">Report now <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
