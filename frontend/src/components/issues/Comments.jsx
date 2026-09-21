import { useEffect, useState } from 'react';
import { Flag, MessageSquare, Reply } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar, Spinner, Button } from '../common/Button';
import { timeAgo } from '../../utils/formatters';
import * as issueApi from '../../services/issues';
import { useToast } from '../common/Toast';

export default function Comments({ issueId }) {
  const [comments, setComments] = useState(null);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const toast = useToast();

  const load = async () => {
    try {
      setComments(await issueApi.fetchComments(issueId));
    } catch {
      setComments([]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await issueApi.addComment(issueId, content.trim(), replyTo ?? undefined);
      setContent('');
      setReplyTo(null);
      await load();
      toast.success('Comment added');
    } catch (err) {
      toast.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (commentId) => {
    try {
      await issueApi.deleteComment(issueId, commentId);
      await load();
      toast.success('Comment deleted');
    } catch (err) {
      toast.error(err);
    }
  };

  const report = async (commentId) => {
    const reason = window.prompt('Why are you reporting this comment?');
    if (!reason) return;
    try {
      await issueApi.reportComment(issueId, commentId, reason);
      toast.success('Thanks — our moderators will review it');
    } catch (err) {
      toast.error(err);
    }
  };

  if (comments === null) return <Spinner label="Loading comments…" />;

  return (
    <section className="card p-4">
      <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
        <MessageSquare className="h-4 w-4 text-brand-600" /> Discussion ({comments.length})
      </h3>

      {comments.length === 0 && <p className="mb-4 text-sm text-slate-500">No comments yet.</p>}

      <ul className="space-y-4">
        {comments.map((c) => {
          const isMine = user?.id === c.user_id;
          return (
            <li key={c.id} className="flex gap-3">
              <Avatar name={c.author_name} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-semibold text-slate-800">{c.author_name}</span>
                  <span className="text-xs text-slate-400">
                    {timeAgo(c.created_at)}
                    {c.is_edited ? ' · edited' : ''}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-700">{c.content}</p>
                <div className="mt-1 flex items-center gap-3">
                  {isAuthenticated && (
                    <button
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600"
                      onClick={() => {
                        setReplyTo(c.id);
                        setContent('');
                      }}
                    >
                      <Reply className="h-3 w-3" /> Reply
                    </button>
                  )}
                  {isAuthenticated && !isMine && (
                    <button
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600"
                      onClick={() => report(c.id)}
                    >
                      <Flag className="h-3 w-3" /> Report
                    </button>
                  )}
                  {isAuthenticated && isMine && (
                    <button
                      className="text-xs text-slate-500 hover:text-rose-600"
                      onClick={() => remove(c.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
                {replyTo === c.id && (
                  <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-500">
                    Replying to {c.author_name}.{' '}
                    <button className="text-brand-600" onClick={() => setReplyTo(null)}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {isAuthenticated ? (
        <form onSubmit={submit} className="mt-4 border-t border-slate-100 pt-4">
          <textarea
            className="input min-h-[90px]"
            placeholder="Share an update, question or useful detail…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="mt-2 flex justify-end">
            <Button type="submit" disabled={submitting || !content.trim()}>
              {submitting ? 'Posting…' : 'Post comment'}
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">
          <a href="/auth?mode=login" className="font-medium text-brand-600">
            Log in
          </a>{' '}
          to join the discussion.
        </p>
      )}
      {toast.node}
    </section>
  );
}