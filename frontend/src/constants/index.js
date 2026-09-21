export const STATUS_META = {
  SUBMITTED: { label: 'Submitted', classes: 'bg-slate-100 text-slate-700', order: 0 },
  UNDER_REVIEW: { label: 'Under review', classes: 'bg-amber-100 text-amber-800', order: 1 },
  ASSIGNED: { label: 'Assigned', classes: 'bg-sky-100 text-sky-800', order: 2 },
  IN_PROGRESS: { label: 'In progress', classes: 'bg-indigo-100 text-indigo-800', order: 3 },
  REOPENED: { label: 'Reopened', classes: 'bg-orange-100 text-orange-800', order: 4 },
  RESOLVED: { label: 'Resolved', classes: 'bg-emerald-100 text-emerald-800', order: 5 },
  CLOSED: { label: 'Closed', classes: 'bg-green-100 text-green-900', order: 6 },
  REJECTED: { label: 'Rejected', classes: 'bg-rose-100 text-rose-800', order: 7 },
  DUPLICATE: { label: 'Duplicate', classes: 'bg-purple-100 text-purple-800', order: 8 },
};

export const PRIORITY_META = {
  LOW: { label: 'Low', classes: 'bg-green-100 text-green-800' },
  MEDIUM: { label: 'Medium', classes: 'bg-amber-100 text-amber-800' },
  HIGH: { label: 'High', classes: 'bg-orange-100 text-orange-800' },
  CRITICAL: { label: 'Critical', classes: 'bg-rose-100 text-rose-800' },
};

export const STATUS_ORDER = Object.keys(STATUS_META).sort(
  (a, b) => STATUS_META[a].order - STATUS_META[b].order,
);

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'most_supported', label: 'Most supported' },
  { value: 'priority', label: 'Priority' },
];

export const DISTANCE_OPTIONS = [
  { value: 500, label: 'Within 500 m' },
  { value: 1000, label: 'Within 1 km' },
  { value: 2000, label: 'Within 2 km' },
  { value: 5000, label: 'Within 5 km' },
];

export const DEFAULT_COORDS = {
  dehradun: [30.3165, 78.0322],
};

export const API_URL = '/api/v1';
export const MEDIA_URL = '/uploads';