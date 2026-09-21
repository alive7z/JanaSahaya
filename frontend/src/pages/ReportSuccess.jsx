import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowRight, LayoutDashboard, MapPin, Tag } from 'lucide-react';
import Illustration from '../components/common/Illustration';

export default function ReportSuccess() {
  const { state } = useLocation();
  if (!state?.issueId) return <Navigate to="/dashboard" replace />;

  return (
    <div className="page-shell flex min-h-[75vh] items-center justify-center py-12">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-[2rem] border border-brand-100 bg-white p-7 text-center shadow-soft sm:p-10">
        <div className="absolute left-0 top-0 h-56 w-56 opacity-40 dot-pattern" />
        <Illustration name="report-success" alt="Citizen celebrating a successfully submitted civic report" eager className="relative mx-auto w-full max-w-sm" />
        <span className="section-kicker mt-2">Report received</span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Issue Reported Successfully!</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">Your report is now visible to the community and ready for review by the responsible authority.</p>

        <dl className="mx-auto mt-7 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
          <Info label="Issue ID" value={`#${state.issueId}`} icon={ArrowRight} />
          <Info label="Location" value={state.location} icon={MapPin} />
          <Info label="Category" value={state.category} icon={Tag} />
        </dl>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to={`/issue/${state.issueId}`} className="btn-primary">View Report <ArrowRight className="h-4 w-4" /></Link>
          <Link to="/dashboard" className="btn-secondary"><LayoutDashboard className="h-4 w-4" /> Back to Dashboard</Link>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl bg-brand-50/70 p-4">
      <dt className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-700"><Icon className="h-3.5 w-3.5" /> {label}</dt>
      <dd className="mt-2 line-clamp-2 text-sm font-semibold text-slate-800">{value || '—'}</dd>
    </div>
  );
}
