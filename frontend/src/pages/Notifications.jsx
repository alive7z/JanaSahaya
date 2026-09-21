import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { Button, EmptyState, Spinner } from '../components/common/Button';
import { Pagination } from '../components/common/Pagination';
import { useToast } from '../components/common/Toast';
import { useSocket } from '../context/SocketContext';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../services/notifications';
import { timeAgo, formatLabel } from '../utils/formatters';

const NOTIFICATION_TYPES = {
  STATUS_CHANGE: 'Status change',
  COMMENT: 'New comment',
  REPLY: 'Reply to your comment',
  VOTE: 'Support',
  FOLLOW: 'New follower',
  ASSIGNMENT: 'Assigned to you',
  SLA: 'SLA alert',
  ESCALATION: 'Escalated',
  RESOLVED: 'Resolved',
  DUPLICATE: 'Duplicate found',
  MODERATION: 'Moderation',
};

export default function Notifications() {
  const toast = useToast();
  const socketCtx = useSocket();
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  const load = (p = page) =>
    fetchNotifications(p)
      .then(setData)
      .catch((e) => toast.error(e, 'Failed to load notifications'));

  useEffect(() => { load(); }, [page]);

  useEffect(() => {
    if (!socketCtx.ready) return undefined;
    return socketCtx.subscribe('notification:new', () => load());
  }, [socketCtx.ready]);

  const markOne = async (id) => {
    try {
      await markNotificationRead(id);
      load();
    } catch (e) {
      toast.error(e);
    }
  };

  const markAll = async () => {
    try {
      await markAllNotificationsRead();
      load();
      toast.success('All marked as read');
    } catch (e) {
      toast.error(e);
    }
  };

  if (!data) return <Spinner label="Loading notifications…" />;

  const items = data.notifications || [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-600">
            {data.unread || 0} unread
          </p>
        </div>
        {items.length > 0 && (
          <Button variant="secondary" onClick={markAll}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      {!items.length ? (
        <EmptyState title="Nothing here yet" body="Notifications about your issues will appear here." />
      ) : (
        <ul className="card divide-y divide-slate-100">
          {items.map((n) => (
            <li key={n.id} className={`px-4 py-3 ${n.is_read ? '' : 'bg-brand-50/60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex h-2 w-2 shrink-0 rounded-full ${n.is_read ? 'bg-slate-200' : 'bg-brand-500'}`} />
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      {NOTIFICATION_TYPES[n.type] || formatLabel(n.type) || 'Update'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{n.title || n.message}</p>
                  {n.body && <p className="mt-0.5 text-sm text-slate-500">{n.body}</p>}
                  <p className="mt-1 text-xs text-slate-400">{timeAgo(n.created_at)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {n.link && <Link to={n.link} className="text-sm font-medium text-brand-600 hover:underline">Open →</Link>}
                  {!n.is_read && (
                    <Button variant="secondary" size="sm" onClick={() => markOne(n.id)}>Mark read</Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={data.page || 1} pages={data.pages || 1} onChange={setPage} />
      {toast.node}
    </div>
  );
}