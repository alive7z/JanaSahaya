export function formatDate(value, opts = {}) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: opts.year ?? 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...opts,
  });
}

export function timeAgo(value) {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function greetingForHour(hour = new Date().getHours()) {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 16) return 'Good afternoon';
  if (hour >= 16 && hour < 21) return 'Good evening';
  return 'Good night';
}

export function distanceLabel(metres) {
  if (metres == null) return '';
  if (metres < 1000) {
    if (metres <= 50) return `${metres} m`;
    return `${Math.round(metres)} m`;
  }
  return `${(metres / 1000).toFixed(1)} km`;
}

export function deadlineLabel(deadline) {
  if (!deadline) return null;
  const target = new Date(deadline);
  const diff = target.getTime() - Date.now();
  const hours = Math.round(diff / 3600000);
  if (diff < 0) return `Overdue by ${Math.abs(hours)}h`;
  if (hours < 24) return `Due in ${hours}h`;
  return `Due in ${Math.round(hours / 24)}d`;
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function clsx(...args) {
  return args.filter(Boolean).join(' ');
}

const LABEL_ACRONYMS = new Set([
  'SLA', 'ID', 'URL', 'API', 'GPS', 'UUID', 'PDF', 'CSV', 'SMS', 'OTP',
]);

export function formatLabel(value) {
  if (value == null || value === '') return '';
  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w+/g, (word) =>
      LABEL_ACRONYMS.has(word.toUpperCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    );
}

export function mediaPath(p) {
  if (!p) return null;
  return p;
}
