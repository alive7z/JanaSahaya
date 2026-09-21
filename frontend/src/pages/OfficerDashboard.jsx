import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertOctagon, Building2, CheckCircle2, Clock, Play, AlertTriangle, CheckCheck, UploadCloud,
} from 'lucide-react';
import StatCard from '../components/common/StatCard';
import IssueCard from '../components/issues/IssueCard';
import PriorityExplanation from '../components/issues/PriorityExplanation';
import { Badge } from '../components/common/Badge';
import { EmptyState, Button, Spinner } from '../components/common/Button';
import Modal from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { officerDashboard } from '../services/dashboard';
import { acceptIssue, resolveIssue } from '../services/issues';
import { useAuth } from '../context/AuthContext';
import Illustration from '../components/common/Illustration';

function timeLeftLabel(deadline) {
  const diff = new Date(deadline) - Date.now();
  const overdue = diff < 0;
  const totalMin = Math.floor(Math.abs(diff) / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return {
    text: `${overdue ? 'Overdue by ' : 'Due in '}${h}h ${m}m`,
    overdue,
  };
}

export default function OfficerDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [resolving, setResolving] = useState(null);
  const [resolveForm, setResolveForm] = useState({ note: '', evidence: [] });

  const reload = () => officerDashboard().then(setData).catch(() => setData({}));
  useEffect(() => { reload(); }, []);

  const issues = data?.issues || [];

  const priorityQueue = useMemo(
    () => issues.filter((i) => ['SUBMITTED', 'UNDER_REVIEW', 'REOPENED'].includes(i.status)),
    [issues],
  );
  const assigned = useMemo(
    () => issues.filter((i) => ['ASSIGNED', 'IN_PROGRESS'].includes(i.status) && String(i.assigned_officer_id) === String(user?.id)),
    [issues, user?.id],
  );
  const openInDept = useMemo(
    () => issues.filter((i) => ['SUBMITTED', 'ASSIGNED', 'UNDER_REVIEW', 'REOPENED'].includes(i.status)),
    [issues],
  );

  const onAccept = async (id) => {
    try {
      await acceptIssue(id);
      toast.success('Issue accepted');
      reload();
    } catch (err) {
      toast.error(err, 'Could not accept');
    }
  };

  const onResolve = async () => {
    if (!resolveForm.note.trim()) { toast.error(new Error(), 'Please add a resolution note'); return; }
    if (!resolveForm.evidence.length) { toast.error(new Error(), 'Please attach at least one evidence image'); return; }
    try {
      await resolveIssue(resolving.id, { note: resolveForm.note, evidence: resolveForm.evidence });
      toast.success('Issue resolved — awaiting citizen verification');
      setResolving(null);
      setResolveForm({ note: '', evidence: [] });
      reload();
    } catch (err) {
      toast.error(err, 'Could not resolve');
    }
  };

  if (!data) return <Spinner label="Loading officer console…" />;

  return (
    <div className="page-shell py-8">
      <section className="grid min-h-48 items-center overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-r from-brand-50 to-white px-7 py-6 lg:grid-cols-[1fr_260px]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">Department operations</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">Officer workspace</h1>
          <p className="mt-2 text-sm text-slate-600">
            {user?.full_name || 'Officer'} · {data.department?.name || 'Unknown department'}
          </p>
          <div className="mt-4"><Badge color="brand">Priority queue: {priorityQueue.length}</Badge></div>
        </div>
        <Illustration name="admin-dashboard" alt="Civic officer coordinating city issue resolution" eager className="ml-auto hidden w-56 lg:block" />
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open in department" value={data.stats?.open_in_department ?? 0} icon={AlertOctagon} />
        <StatCard label="Assigned to you" value={data.stats?.assigned_to_me ?? 0} icon={Building2} />
        <StatCard label="Resolved by you" value={data.stats?.resolved_by_me ?? 0} icon={CheckCircle2} />
        <StatCard label="SLA warnings" value={data.sla_warnings_count ?? 0} icon={Clock} hint="at risk of escalation" />
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Priority queue — needs attention</h2>
        {!priorityQueue.length ? (
          <EmptyState compact illustration="admin-map-empty" title="All caught up" body="No unassigned issues are waiting in the queue." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {priorityQueue.map((issue) => (
              <div key={issue.id} className="card p-4">
                <IssueCard issue={issue} compact />
                {issue.explanation && (
                  <PriorityExplanation
                    score={issue.explanation.score}
                    priority={issue.explanation.priority}
                    reasons={issue.explanation.reasons}
                    compact
                  />
                )}
                <Button className="mt-3 w-full" onClick={() => onAccept(issue.id)}>
                  <Play className="h-4 w-4" /> Accept & start
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Assigned to you — in progress</h2>
        {!assigned.length ? (
          <EmptyState compact illustration="reports-empty" title="No assigned issues" body="Accepted issues will appear here while work is in progress." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assigned.map((issue) => {
              const t = issue.resolution_deadline ? timeLeftLabel(issue.resolution_deadline) : null;
              return (
                <div key={issue.id} className="card p-4">
                  <IssueCard issue={issue} compact />
                  {t && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs">
                      <AlertTriangle className={`h-3.5 w-3.5 ${t.overdue ? 'text-rose-600' : 'text-amber-600'}`} />
                      <span className={t.overdue ? 'font-medium text-rose-600' : 'text-amber-700'}>{t.text}</span>
                    </div>
                  )}
                  {issue.status === 'IN_PROGRESS' && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => {
                          setResolving(issue);
                          setResolveForm({ note: '', evidence: [] });
                        }}
                      >
                        <CheckCheck className="h-4 w-4" /> Mark resolved
                      </Button>
                      <Link
                        to={`/issue/${issue.id}`}
                        className="btn-secondary inline-flex items-center justify-center rounded-lg px-3 text-sm"
                      >
                        View
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">All open in your department</h2>
        {!openInDept.length ? (
          <EmptyState compact illustration="admin-map-empty" title="No open department issues" body="There is no active queue for your department." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {openInDept.map((issue) => (
              <IssueCard key={issue.id} issue={issue} compact />
            ))}
          </div>
        )}
      </section>
      {toast.node}

      <Modal open={!!resolving} onClose={() => setResolving(null)} title={`Resolve issue #${resolving?.id ?? ''}`}>
        {resolving && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">{resolving.title}</p>
            <label className="block">
              <span className="label">Resolution note</span>
              <textarea
                className="input"
                rows="3"
                placeholder="Describe what was done to resolve this issue…"
                value={resolveForm.note}
                onChange={(e) => setResolveForm((f) => ({ ...f, note: e.target.value }))}
              />
            </label>
            <label className="block">
              <span className="label">Evidence photos (required)</span>
              <input
                className="input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => setResolveForm((f) => ({ ...f, evidence: [...e.target.files] }))}
              />
              <span className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                <UploadCloud className="h-3.5 w-3.5" /> JPEG / PNG / WebP only — content is verified on the server
              </span>
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setResolving(null)}>Cancel</Button>
              <Button onClick={onResolve} disabled={resolveForm.evidence.length === 0}>Resolve & notify followers</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
