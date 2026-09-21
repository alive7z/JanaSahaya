const TONES = {
  SUBMITTED: 'bg-sky-100 text-sky-700',
  UNDER_REVIEW: 'bg-violet-100 text-violet-700',
  ASSIGNED: 'bg-indigo-100 text-indigo-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  REOPENED: 'bg-orange-100 text-orange-700',
  CLOSED: 'bg-slate-200 text-slate-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  DUPLICATE: 'bg-slate-300 text-slate-600',
  OPEN: 'bg-red-100 text-red-700',
  CRITICAL: 'bg-rose-100 text-rose-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-emerald-100 text-emerald-700',
};

export function statusTone(value) {
  return TONES[value] || 'bg-slate-100 text-slate-700';
}

export function priorityTone(value) {
  return TONES[value] || 'bg-slate-100 text-slate-700';
}

export default TONES;