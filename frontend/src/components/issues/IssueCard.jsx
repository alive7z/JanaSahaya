import { Link } from 'react-router-dom';
import { MapPin, MessageSquare, ThumbsUp } from 'lucide-react';
import { StatusBadge, PriorityBadge } from '../common/Badge';
import { timeAgo, distanceLabel } from '../../utils/formatters';

export default function IssueCard({ issue, distance }) {
  return (
    <Link
      to={`/issue/${issue.id}`}
      className="card group flex flex-col gap-3 p-4 transition hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>#{issue.id}</span>
            <span className="text-slate-300">·</span>
            <span>{timeAgo(issue.created_at)}</span>
            {distance != null && (
              <>
                <span className="text-slate-300">·</span>
                <span className="font-medium text-brand-600">{distanceLabel(distance)}</span>
              </>
            )}
          </div>
          <h3 className="mt-1 line-clamp-2 font-semibold text-slate-900 group-hover:text-brand-700">
            {issue.title}
          </h3>
        </div>
        {issue.category_name && (
          <span className="badge shrink-0 bg-slate-100 text-slate-600">{issue.category_name}</span>
        )}
      </div>

      <p className="line-clamp-2 text-sm text-slate-600">{issue.description}</p>

      <div className="mt-auto flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={issue.status} />
          <PriorityBadge priority={issue.priority} />
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {issue.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {issue.city}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <ThumbsUp className="h-3 w-3" />
            {issue.vote_count}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {issue.comment_count}
          </span>
        </div>
      </div>
    </Link>
  );
}