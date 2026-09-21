import { CheckCircle2, MapPin, MessageSquare, Award } from 'lucide-react';
import { formatDate, formatLabel } from '../../utils/formatters';
import { STATUS_META } from '../../constants';

const TYPE_ICON = {
  assignment: MapPin,
  comment: MessageSquare,
  resolution: CheckCircle2,
  points: Award,
};

function Icon({ type }) {
  const C = TYPE_ICON[type] || CheckCircle2;
  return <C className="h-4 w-4" />;
}

export default function StatusTimeline({ timeline }) {
  if (!timeline || !timeline.events?.length) {
    return <p className="text-sm text-slate-500">No activity recorded yet.</p>;
  }

  return (
    <ol className="relative space-y-4 border-l-2 border-slate-200 pl-6">
      {timeline.events.map((ev) => (
        <li key={ev.id} className="relative">
          <span className="absolute -left-[1.95rem] top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
            <Icon type="assignment" />
          </span>
          <p className="text-sm font-medium text-slate-800">
            {fromLabel(ev.from_status)} → <span className="text-brand-700">{toLabel(ev.to_status)}</span>
          </p>
          {ev.note && <p className="mt-0.5 text-sm text-slate-600">{ev.note}</p>}
          <p className="mt-0.5 text-xs text-slate-400">
            {formatDate(ev.created_at)}
            {ev.actor_name ? ` · ${ev.actor_name}` : ''}
          </p>
        </li>
      ))}
    </ol>
  );
}

function toLabel(status) {
  if (!status) return 'Unknown';
  return STATUS_META[status]?.label || formatLabel(status);
}

function fromLabel(status) {
  return status ? toLabel(status) : 'Created';
}