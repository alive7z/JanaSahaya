import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, AlertTriangle, TrendingUp, Timer, Building2, FileText, ShieldAlert,
  Briefcase, Pencil, Ban, CheckCircle2, XCircle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from 'recharts';
import StatCard from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { Pagination } from '../components/common/Pagination';
import { Button, EmptyState, Spinner } from '../components/common/Button';
import Modal from '../components/common/Modal';
import { Select } from '../components/common/Select';
import { statusTone, priorityTone } from '../components/common/tones';
import { useToast } from '../components/common/Toast';
import { adminDashboard } from '../services/dashboard';
import { analyticsOverview, analyticsDepartments } from '../services/dashboard';
import {
  adminListUsers, adminAuditLogs, adminSlaStatus, adminDepartments,
  adminCreateDepartment, adminCategories, adminCreateCategory, adminCreateOfficer,
  adminReports, adminModerate, adminIssues, adminOfficers, adminSlaRules,
  adminUpdateSlaRule, adminUpdateCategory, adminIssuesReassign, adminStatusOverride,
  adminToggleBan,
} from '../services/admin';
import Illustration from '../components/common/Illustration';

const PIE_COLORS = ['#0ea5e9', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#64748b'];

const TABS = ['overview', 'issues', 'users', 'officers', 'audit', 'sla', 'moderation', 'referential'];

export default function AdminDashboard() {
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);

  useEffect(() => { adminDashboard().then(setData).catch(() => {}); }, []);

  const nav = (name) =>
    `inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${tab === name ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-100'}`;

  return (
    <div className="page-shell py-8">
      <section className="relative grid min-h-52 items-center overflow-hidden rounded-3xl bg-slate-950 px-7 py-8 text-white shadow-soft sm:px-9 lg:grid-cols-[1fr_300px]">
        <div className="absolute right-0 top-0 h-64 w-64 opacity-20 dot-pattern" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-300">JanaSetu Administration</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Administration Command Center</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Monitor reports, coordinate departments and track civic issue resolution.</p>
        </div>
        <Illustration name="admin-dashboard" alt="Administrator monitoring civic analytics" eager className="relative ml-auto hidden w-64 lg:block" />
      </section>

      <div className="mt-4 flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button key={t} className={nav(t)} onClick={() => setTab(t)}>
            {t === 'overview' && <TrendingUp className="h-4 w-4" />}
            {t === 'issues' && <FileText className="h-4 w-4" />}
            {t === 'users' && <Users className="h-4 w-4" />}
            {t === 'officers' && <Briefcase className="h-4 w-4" />}
            {t === 'audit' && <FileText className="h-4 w-4" />}
            {t === 'sla' && <Timer className="h-4 w-4" />}
            {t === 'moderation' && <ShieldAlert className="h-4 w-4" />}
            {t === 'referential' && <Building2 className="h-4 w-4" />}
            <span className="capitalize">{t}</span>
          </button>
        ))}
      </div>

      {tab === 'overview' && (data ? <OverviewTab stats={data.stats} toast={toast} /> : <Spinner />)}
      {tab === 'issues' && <IssuesTab toast={toast} />}
      {tab === 'users' && <UsersTab toast={toast} />}
      {tab === 'officers' && <OfficersTab toast={toast} />}
      {tab === 'audit' && <AuditTab toast={toast} />}
      {tab === 'sla' && <SlaTab toast={toast} />}
      {tab === 'moderation' && <ModerationTab toast={toast} />}
      {tab === 'referential' && <ReferentialTab toast={toast} />}
      {toast.node}
    </div>
  );
}

function OverviewTab({ stats, toast }) {
  const [charts, setCharts] = useState(null);
  useEffect(() => {
    Promise.all([analyticsOverview(), analyticsDepartments()])
      .then(([overview, dept]) => setCharts({ overview, dept }))
      .catch((e) => toast.error(e, 'Could not load analytics'));
  }, []);

  const daily = (charts?.overview?.issuesPerDay || []).map((d) => ({
    date: String(d.date),
    issues: Number(d.count),
  }));
  const priority = (charts?.overview?.priorityDistribution || []).map((d) => ({
    name: d.priority || (d.id ? `P${d.id}` : 'Unknown'),
    value: Number(d.count),
  }));
  const dept = (charts?.dept?.departments || []).map((d) => ({
    name: (d.name || 'Unassigned').slice(0, 14),
    resolved: Number(d.resolved ?? 0),
    total: Number(d.total ?? 0),
  }));

  return (
    <div className="mt-6">
      <div className="mb-6 flex items-center justify-between overflow-hidden rounded-2xl border border-brand-100 bg-brand-50/60 px-5 py-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Analytics overview</p><p className="mt-1 text-sm text-slate-600">Live operational performance across the city.</p></div>
        <Illustration name="analytics" alt="Analyst viewing city data" className="hidden w-32 sm:block" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={stats.users} icon={Users} />
        <StatCard label="Total issues" value={stats.issues} icon={FileText} />
        <StatCard label="Open issues" value={stats.openIssues} icon={AlertTriangle} to="/issues" />
        <StatCard label="Resolved" value={stats.resolvedIssues} icon={TrendingUp} />
        <StatCard label="Critical open" value={stats.criticalIssues} icon={ShieldAlert} hint="need immediate attention" />
        <StatCard label="Departments" value={stats.departments} icon={Building2} />
        <StatCard label="Resolution rate" value={`${stats.resolutionRate}%`} icon={TrendingUp} />
        <StatCard label="SLA compliance" value={`${stats.slaCompliance}%`} icon={Timer} hint={`avg ${stats.avgResolutionHours}h to resolve`} />
      </div>

      {!charts ? <Spinner label="Loading analytics…" /> : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="card p-5">
            <h3 className="mb-3 font-semibold text-slate-800">Issues per day</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={daily}>
                  <defs>
                    <linearGradient id="fillDaily" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                  <Tooltip />
                  <Area type="monotone" dataKey="issues" stroke="#0ea5e9" fill="url(#fillDaily)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="mb-3 font-semibold text-slate-800">Priority distribution</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={priority} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {priority.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5 lg:col-span-2">
            <h3 className="mb-3 font-semibold text-slate-800">Issues by department</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dept}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="total" name="Total" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IssuesTab({ toast }) {
  const [rows, setRows] = useState(null);
  const [officers, setOfficers] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: '', departmentId: '', priority: '' });
  const [page, setPage] = useState(1);
  const [action, setAction] = useState(null); // { issue, mode: 'status' | 'reassign' }

  const load = () => {
    adminIssues({ ...filters, page }).then(setRows).catch((e) => toast.error(e, 'Could not load issues'));
  };
  useEffect(() => { load(); }, [page, filters.status, filters.departmentId, filters.priority]);
  useEffect(() => { adminOfficers().then(setOfficers).catch(() => {}); }, []);

  const submitAction = async () => {
    if (!action) return;
    try {
      if (action.mode === 'reassign') {
        await adminIssuesReassign(action.issue.id, Number(action.officerId));
        toast.success('Issue reassigned');
      } else {
        await adminStatusOverride(action.issue.id, action.status, action.note || '');
        toast.success('Status updated');
      }
      setAction(null);
      load();
    } catch (e) { toast.error(e); }
  };

  const search = () => { setPage(1); adminIssues({ ...filters, page: 1 }).then(setRows).catch(() => {}); };

  if (!rows) return <Spinner />;
  return (
    <div className="mt-6">
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <label className="block flex-1 min-w-[180px]">
          <span className="label">Search</span>
          <input className="input" placeholder="Title or description…" value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && search()} />
        </label>
        <label className="block">
          <span className="label">Status</span>
          <select className="input" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="">All statuses</option>
            {['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REOPENED', 'CLOSED', 'REJECTED', 'DUPLICATE'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label">Priority</span>
          <select className="input" value={filters.priority} onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}>
            <option value="">All priorities</option>
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <Button onClick={search}>Filter</Button>
      </div>

      {rows.summary && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Badge>Total {rows.summary.total ?? 0}</Badge>
          <Badge>Open {rows.summary.open ?? 0}</Badge>
          <Badge>In progress {rows.summary.inProgress ?? 0}</Badge>
          <Badge>Resolved {rows.summary.resolved ?? 0}</Badge>
          <Badge>Submitted {rows.summary.submitted ?? 0}</Badge>
        </div>
      )}

      <div className="card mt-3 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3 font-medium">Issue</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Reporter</th>
              <th className="px-4 py-3 font-medium text-right">Votes</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(rows.issues || []).map((i) => (
              <tr key={i.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link to={`/issue/${i.id}`} className="font-medium text-slate-800 hover:text-brand-700">{i.title}</Link>
                  <p className="text-xs text-slate-400">{i.category}{i.city ? ` · ${i.city}` : ''}</p>
                </td>
                <td className="px-4 py-3"><Badge className={statusTone(i.status)}>{i.status}</Badge></td>
                <td className="px-4 py-3"><Badge className={priorityTone(i.priority)}>{i.priority}</Badge></td>
                <td className="px-4 py-3 text-slate-600">{i.department || '—'}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{i.reporter || '—'}</td>
                <td className="px-4 py-3 text-right text-slate-600">{i.vote_count ?? 0}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setAction({ issue: i, mode: 'status', status: i.status, note: '' })}>
                      <Pencil className="h-3.5 w-3.5" /> Status
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setAction({ issue: i, mode: 'reassign', officerId: '' })}>
                      <Users className="h-3.5 w-3.5" /> Reassign
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.issues?.length && (
              <tr><td colSpan={7} className="p-4"><EmptyState compact illustration="admin-map-empty" title="No reported issues match these filters." body="Try changing or clearing the current filters." /></td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={rows.page} pages={rows.pages} onChange={setPage} />

      <Modal open={!!action} onClose={() => setAction(null)}
        title={action?.mode === 'reassign' ? `Reassign issue #${action?.issue?.id}` : `Change status — #${action?.issue?.id}`}>
        {action?.mode === 'reassign' ? (
          <Select label="Officer" value={action.officerId} onChange={(e) => setAction((a) => ({ ...a, officerId: e.target.value }))}
            options={officers.map((o) => ({ value: o.id, label: `${o.full_name} (${o.department || 'no dept'})` }))} />
        ) : (
          <div className="space-y-3">
            <Select label="New status" value={action.status} onChange={(e) => setAction((a) => ({ ...a, status: e.target.value }))}
              options={['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED']} />
            <label className="block">
              <span className="label">Note (optional)</span>
              <input className="input" placeholder="Reason for this change…" value={action.note}
                onChange={(e) => setAction((a) => ({ ...a, note: e.target.value }))} />
            </label>
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setAction(null)}>Cancel</Button>
          <Button onClick={submitAction} disabled={action?.mode === 'reassign' && !action?.officerId}>{action?.mode === 'reassign' ? 'Reassign' : 'Update'}</Button>
        </div>
      </Modal>
    </div>
  );
}

function UsersTab({ toast }) {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState('');

  const load = () => { adminListUsers({ page, search }).then(setRows).catch((e) => toast.error(e, 'Could not load users')); };
  useEffect(() => { load(); }, [page]);

  const doSearch = () => { setPage(1); adminListUsers({ page: 1, search }).then(setRows).catch(() => {}); };

  const toggleBan = async (u) => {
    try { await adminToggleBan(u.id); toast.success('Ban status toggled'); load(); }
    catch (e) { toast.error(e); }
  };

  if (!rows) return <Spinner />;
  return (
    <div className="mt-6">
      <div className="card flex items-center gap-2 p-4">
        <input className="input" placeholder="Search name / email / phone…" value={search}
          onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()} />
        <Button onClick={doSearch}>Search</Button>
      </div>
      <div className="card mt-3 divide-y divide-slate-100">
        {(rows.users || []).map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800">{u.full_name} {u.is_banned ? <Badge>Banned</Badge> : null}</p>
              <p className="text-xs text-slate-500">{u.email}{u.city ? ` · ${u.city}` : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              {(u.roles || []).map((r) => <Badge key={r}>{r}</Badge>)}
              <span className="text-xs text-slate-400">+{u.points ?? 0} pts</span>
              <Button size="sm" variant={u.is_banned ? 'secondary' : 'danger'} onClick={() => toggleBan(u)}>
                {u.is_banned ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />} {u.is_banned ? 'Unban' : 'Ban'}
              </Button>
            </div>
          </div>
        ))}
        {!rows.users?.length && <EmptyState compact illustration="no-results" title="No users found" />}
      </div>
      <Pagination page={rows.page} pages={rows.pages} onChange={setPage} />
    </div>
  );
}

function OfficersTab({ toast }) {
  const [officers, setOfficers] = useState(null);
  const load = () => { adminOfficers().then(setOfficers).catch((e) => toast.error(e, 'Could not load officers')); };
  useEffect(() => { load(); }, []);

  if (!officers) return <Spinner />;
  return (
    <div className="card mt-6 overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="px-4 py-3 font-medium">Officer</th>
            <th className="px-4 py-3 font-medium">Department</th>
            <th className="px-4 py-3 font-medium text-center">Open</th>
            <th className="px-4 py-3 font-medium text-center">Resolved</th>
            <th className="px-4 py-3 font-medium text-right">Avg resolution (h)</th>
            <th className="px-4 py-3 font-medium text-right">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {officers.map((o) => (
            <tr key={o.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <p className="font-medium text-slate-800">{o.full_name}</p>
                <p className="text-xs text-slate-400">{o.email}</p>
              </td>
              <td className="px-4 py-3 text-slate-600">{o.department || '—'}</td>
              <td className="px-4 py-3 text-center text-slate-700">{o.open_issues ?? 0}</td>
              <td className="px-4 py-3 text-center text-emerald-700">{o.resolved_issues ?? 0}</td>
              <td className="px-4 py-3 text-right text-slate-600">{o.avg_resolution_hours ?? '—'}</td>
              <td className="px-4 py-3 text-right">{o.is_banned ? <Badge>Banned</Badge> : <Badge color="brand">Active</Badge>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditTab({ toast }) {
  const [rows, setRows] = useState({ logs: [], page: 1, pages: 1 });
  useEffect(() => {
    adminAuditLogs({ page: 1 }).then(setRows).catch((e) => toast.error(e, 'Could not load audit log'));
  }, []);
  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div><h2 className="font-bold text-slate-900">Audit history</h2><p className="mt-1 text-sm text-slate-500">Security-sensitive administrative activity and accountability records.</p></div>
        <Illustration name="audit" alt="Documents and security audit history" className="hidden w-32 sm:block" />
      </div>
      <div className="card divide-y divide-slate-100 overflow-hidden">
        {!rows.logs?.length ? (
          <EmptyState compact illustration="audit" title="No audit entries yet" body="Administrative actions will appear here." />
        ) : rows.logs.map((a) => (
          <div key={a.id} className="px-4 py-3 text-sm">
            <p className="text-slate-700"><span className="font-medium">{a.actor_name || 'system'}</span> {a.action}{a.resource_type ? <span className="text-slate-500"> → {a.resource_type}{a.resource_id ? ` #${a.resource_id}` : ''}</span> : null}</p>
            <p className="mt-0.5 text-xs text-slate-400">{a.ip ?? ''} · {a.user_agent ?? ''} · {new Date(a.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlaTab({ toast }) {
  const [status, setStatus] = useState(null);
  const [rules, setRules] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = () => {
    adminSlaStatus().then(setStatus).catch((e) => toast.error(e, 'Could not load SLA status'));
    adminSlaRules().then(setRules).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const saveRule = async () => {
    try {
      await adminUpdateSlaRule(editing.id, { hours: Number(editing.hours), description: editing.description });
      toast.success('SLA rule updated');
      setEditing(null);
      load();
    } catch (e) { toast.error(e); }
  };

  if (!status) return <Spinner />;
  const items = [...(status.violations || []).map((i) => ({ ...i, violated: true })), ...(status.warnings || []).map((i) => ({ ...i, violated: false }))];

  return (
    <div className="mt-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="card p-4 text-sm">
              <p className="font-semibold text-slate-800">SLA breached</p>
              <p className="mt-1 text-2xl font-bold text-rose-600">{status.violations?.length ?? 0}</p>
            </div>
            <div className="card p-4 text-sm">
              <p className="font-semibold text-slate-800">Due within 24h</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{status.warnings?.length ?? 0}</p>
            </div>
          </div>
          <div className="card divide-y divide-slate-100">
            {!items.length ? <EmptyState title="No SLA issues" body="All in-progress issues are within their resolution deadline." /> : items.map((i) => (
              <div key={`${i.violated}-${i.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
                <Link to={`/issue/${i.id}`} className="truncate text-sm text-slate-700 hover:text-brand-700">{i.title}</Link>
                <Badge className={i.violated ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}>
                  {i.violated
                    ? `Overdue by ${Math.round((Date.now() - new Date(i.resolution_deadline)) / 3600000)}h`
                    : `${Math.max(0, Math.round((new Date(i.resolution_deadline) - Date.now()) / 3600000))}h left`}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-700 uppercase">SLA rules</h3>
          <div className="card divide-y divide-slate-100">
            {rules.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{r.priority} — <span className="font-mono">{r.hours}h</span></p>
                  <p className="text-xs text-slate-500">{r.description}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit ${editing?.priority || ''} SLA rule`}>
        {editing && (
          <div className="space-y-3">
            <label className="block">
              <span className="label">Resolution hours</span>
              <input className="input" type="number" min="1" value={editing.hours}
                onChange={(e) => setEditing((r) => ({ ...r, hours: e.target.value }))} />
            </label>
            <label className="block">
              <span className="label">Description</span>
              <input className="input" value={editing.description}
                onChange={(e) => setEditing((r) => ({ ...r, description: e.target.value }))} />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={saveRule}>Save rule</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ModerationTab({ toast }) {
  const [rows, setRows] = useState(null);
  const load = () => adminReports().then(setRows).catch((e) => toast.error(e, 'Could not load reports'));
  useEffect(() => { load(); }, []);
  if (!rows) return <Spinner />;
  return (
    <div className="card mt-6 divide-y divide-slate-100">
      {!rows.length ? (
        <EmptyState compact illustration="admin-map-empty" title="No pending reports" body="The moderation queue is clear. User reports will appear here." />
      ) : rows.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm text-slate-700">{r.reason}</p>
            <p className="text-xs text-slate-400">Reported by {r.reporter_name || 'anonymous'} · {new Date(r.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={async () => {
              try { await adminModerate(r.id, { action: 'dismiss' }); toast.success('Report dismissed'); load(); }
              catch (e) { toast.error(e); }
            }}>Dismiss</Button>
            <Button size="sm" onClick={async () => {
              try {
                await adminModerate(r.id, {
                  action: 'remove',
                  comment_id: r.content_type === 'COMMENT' ? r.content_id : r.comment_id || undefined,
                });
                toast.success('Content removed');
                load();
              } catch (e) { toast.error(e); }
            }}>Remove</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReferentialTab({ toast }) {
  const [depts, setDepts] = useState([]);
  const [cats, setCats] = useState([]);
  const [newDept, setNewDept] = useState('');
  const [newCat, setNewCat] = useState({ name: '', slug: '', severity: 3, departmentId: '' });
  const [officer, setOfficer] = useState({ fullName: '', email: '', password: '', departmentId: '' });
  const [catEdit, setCatEdit] = useState(null);

  const load = () => {
    adminDepartments().then(setDepts).catch(() => {});
    adminCategories().then(setCats).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const createDept = async () => {
    try { await adminCreateDepartment({ name: newDept }); setNewDept(''); load(); toast.success('Department added'); }
    catch (e) { toast.error(e); }
  };
  const createCat = async (e) => {
    e.preventDefault();
    try {
      await adminCreateCategory({ ...newCat, departmentId: Number(newCat.departmentId) || null });
      setNewCat({ name: '', slug: '', severity: 3, departmentId: '' });
      load(); toast.success('Category added');
    } catch (err) { toast.error(err); }
  };
  const createOfficer = async (e) => {
    e.preventDefault();
    try {
      await adminCreateOfficer({ ...officer, departmentId: Number(officer.departmentId) });
      setOfficer({ fullName: '', email: '', password: '', departmentId: '' });
      toast.success('Officer created');
    } catch (err) { toast.error(err); }
  };
  const saveCat = async () => {
    try {
      await adminUpdateCategory(catEdit.id, { name: catEdit.name, severity: Number(catEdit.severity), description: catEdit.description });
      toast.success('Category updated'); setCatEdit(null); load();
    } catch (e) { toast.error(e); }
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <section className="card p-5">
        <h2 className="mb-3 font-semibold text-slate-800">Departments</h2>
        <ul className="mb-4 space-y-1 text-sm">
          {depts.map((d) => <li key={d.id} className="flex justify-between text-slate-700"><span>{d.name}</span><span className="text-xs text-slate-400">{d.description}</span></li>)}
        </ul>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); createDept(); }}>
          <input className="input" placeholder="New department…" value={newDept} onChange={(e) => setNewDept(e.target.value)} />
          <Button type="submit">Add</Button>
        </form>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold text-slate-800">Categories</h2>
        <ul className="mb-4 space-y-1 text-sm">
          {cats.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 text-slate-700">
              <span>{c.name} <span className="text-xs text-slate-400">(sev {c.severity})</span></span>
              <button className="text-xs font-medium text-brand-600 hover:underline" onClick={() => setCatEdit(c)}>Edit</button>
            </li>
          ))}
        </ul>
        <form className="space-y-2" onSubmit={createCat}>
          <input className="input" placeholder="Name (e.g. Broken streetlight)" value={newCat.name} onChange={(e) => setNewCat((c) => ({ ...c, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <select className="input" value={newCat.severity} onChange={(e) => setNewCat((c) => ({ ...c, severity: Number(e.target.value) }))}>
              {[2, 3, 4, 5].map((s) => <option key={s} value={s}>Severity {s}</option>)}
            </select>
            <select className="input" value={newCat.departmentId} onChange={(e) => setNewCat((c) => ({ ...c, departmentId: e.target.value }))}>
              <option value="">No department</option>
              {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <Button type="submit" className="w-full">Add category</Button>
        </form>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold text-slate-800">Create officer account</h2>
        <form className="space-y-2" onSubmit={createOfficer}>
          <input className="input" placeholder="Full name" value={officer.fullName} onChange={(e) => setOfficer((o) => ({ ...o, fullName: e.target.value }))} />
          <input className="input" type="email" placeholder="Email" value={officer.email} onChange={(e) => setOfficer((o) => ({ ...o, email: e.target.value }))} />
          <input className="input" type="password" placeholder="Password (8+ chars)" value={officer.password} onChange={(e) => setOfficer((o) => ({ ...o, password: e.target.value }))} />
          <select className="input" value={officer.departmentId} onChange={(e) => setOfficer((o) => ({ ...o, departmentId: e.target.value }))}>
            <option value="">Select department…</option>
            {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <Button type="submit" className="w-full">Create</Button>
        </form>
      </section>

      <Modal open={!!catEdit} onClose={() => setCatEdit(null)} title={catEdit ? `Edit category — ${catEdit.name}` : ''}>
        {catEdit && (
          <div className="space-y-3">
            <label className="block">
              <span className="label">Name</span>
              <input className="input" value={catEdit.name} onChange={(e) => setCatEdit((c) => ({ ...c, name: e.target.value }))} />
            </label>
            <label className="block">
              <span className="label">Severity (1-5)</span>
              <input className="input" type="number" min="1" max="5" value={catEdit.severity}
                onChange={(e) => setCatEdit((c) => ({ ...c, severity: e.target.value }))} />
            </label>
            <label className="block">
              <span className="label">Description</span>
              <textarea className="input" rows="3" value={catEdit.description || ''}
                onChange={(e) => setCatEdit((c) => ({ ...c, description: e.target.value }))} />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCatEdit(null)}>Cancel</Button>
              <Button onClick={saveCat}>Save category</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
