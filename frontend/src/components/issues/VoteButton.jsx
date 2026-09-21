import { useState } from 'react';
import { Bell, BellOff, ThumbsUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import * as issueApi from '../../services/issues';
import { clsx } from '../../utils/formatters';

export function VoteButton({ issueId, initialVoted, initialCount, onChange }) {
  const { isAuthenticated } = useAuth();
  const [voted, setVoted] = useState(initialVoted);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (!isAuthenticated) {
      window.location.href = '/auth?mode=login';
      return;
    }
    setBusy(true);
    try {
      const res = await issueApi.vote(issueId, { remove: voted });
      setVoted(!voted);
      setCount(res.voteCount ?? (voted ? count - 1 : count + 1));
      onChange?.(res.voteCount);
    } catch {
      // keep state unchanged on failure
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={voted}
      className={clsx(
        'btn gap-2',
        voted ? 'bg-brand-600 text-white hover:bg-brand-700' : 'btn-secondary',
      )}
    >
      <ThumbsUp className={clsx('h-4 w-4', voted && 'fill-current')} />
      {voted ? 'Supported' : 'Support'}
      <span className={clsx('rounded-full px-2 text-xs font-bold', voted ? 'bg-white/20' : 'bg-brand-50 text-brand-700')}>
        {count}
      </span>
    </button>
  );
}

export function FollowButton({ issueId, initialFollowed, initialCount }) {
  const { isAuthenticated } = useAuth();
  const [following, setFollowing] = useState(initialFollowed);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (!isAuthenticated) {
      window.location.href = '/auth?mode=login';
      return;
    }
    setBusy(true);
    try {
      const res = await issueApi.follow(issueId, { remove: following });
      setFollowing(!following);
      setCount(res.added ? count + 1 : res.removed ? count - 1 : count);
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  };

  return (
    <button onClick={toggle} disabled={busy} className={clsx('btn-secondary gap-2', following && 'ring-brand-300')}>
      {following ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      {following ? 'Following' : 'Follow'}
      {count > 0 && <span className="text-xs text-slate-500">{count}</span>}
    </button>
  );
}