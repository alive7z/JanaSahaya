import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Calendar, ArrowLeft, Building2, User } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { EmptyState, Spinner, Button } from '../components/common/Button';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import { VoteButton, FollowButton } from '../components/issues/VoteButton';
import PriorityExplanation from '../components/issues/PriorityExplanation';
import StatusTimeline from '../components/issues/StatusTimeline';
import Comments from '../components/issues/Comments';
import ResolutionVerification from '../components/issues/ResolutionVerification';
import DuplicateWarning from '../components/issues/DuplicateWarning';
import OfficerActions from '../components/issues/OfficerActions';
import { fetchIssue } from '../services/issues';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { formatDate, deadlineLabel } from '../utils/formatters';
import { MEDIA_URL } from '../constants';

const detailIcon = L.divIcon({
  html: '<div style="width:20px;height:20px;border-radius:50%;background:#1b6ef5;border:3px solid white;box-shadow:0 1px 6px rgba(0,0,0,.5)"></div>',
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export default function IssueDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, hasRole, user } = useAuth();
  const socketCtx = useSocket();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const mounted = useRef(true);

  const load = (issueId = id) => {
    fetchIssue(issueId)
      .then((d) => mounted.current && setData(d))
      .catch((e) => mounted.current && setError(e.response?.data?.message || 'Issue not found'));
  };

  useEffect(() => {
    mounted.current = true;
    load();
    socketCtx.joinIssueRoom(id);

    const cleanups = [];
    for (const ev of ['issue:status', 'issue:vote', 'issue:comment', 'issue:comment-removed']) {
      cleanups.push(socketCtx.subscribe(ev, () => load()));
    }
    return () => {
      mounted.current = false;
      socketCtx.leaveIssueRoom(id);
      cleanups.forEach((u) => u?.());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          type="network"
          title="We couldn’t open this report"
          body={error}
          action={<button className="btn-secondary" onClick={() => navigate('/issues')}><ArrowLeft className="h-4 w-4" /> Back to issues</button>}
        />
      </div>
    );
  }

  if (!data) return <Spinner label="Loading issue…" />;

  const { issue, timeline, duplicates, priorityExplanation, myVote, myFollow, myConfirmation, category } = data;
  const images = timeline?.images || [];
  const isOfficer = hasRole('OFFICER');
  const canOfficerAct =
    isOfficer &&
    issue.status !== 'CLOSED' &&
    issue.status !== 'REJECTED' &&
    issue.status !== 'DUPLICATE';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <button className="btn-secondary mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={issue.status} />
              <PriorityBadge priority={issue.priority} />
              {issue.department_name && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <Building2 className="h-3 w-3" /> {issue.department_name}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-bold text-slate-900">
              #{issue.id} · {issue.title}
            </h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> {issue.reporter_name || 'Anonymous'}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> {formatDate(issue.created_at)}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {issue.address || `${issue.city || ''} ${issue.ward || ''}`.trim() || `${issue.latitude}, ${issue.longitude}`}
              </span>
            </div>
            {issue.resolution_deadline && issue.status !== 'RESOLVED' && issue.status !== 'CLOSED' && (
              <span
                className={`mt-2 inline-block text-xs font-semibold ${
                  deadlineLabel(issue.resolution_deadline)?.startsWith('Overdue')
                    ? 'text-rose-600'
                    : 'text-amber-600'
                }`}
              >
                {deadlineLabel(issue.resolution_deadline)}
              </span>
            )}
            <p className="mt-4 text-slate-700">{issue.description}</p>
          </div>

          {duplicates?.length > 0 && (
            <DuplicateWarning
              duplicates={(duplicates || []).map((d) => ({
                issue: d,
                distance: d.distance_metres ?? 0,
                score: d.score,
                isLikelyDuplicate: d.score >= 70,
              }))}
            />
          )}

          {images.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-3 font-semibold text-slate-800">Evidence ({images.length})</h2>
              <div className="grid gap-2 sm:grid-cols-3">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImage(i)}
                    className={`overflow-hidden rounded-lg ring-2 transition ${
                      i === activeImage ? 'ring-brand-500' : 'ring-transparent'
                    }`}
                  >
                    <img
                      src={`${MEDIA_URL}/${img.filepath.replace(/^uploads\//, '')}`}
                      alt={`Evidence ${i + 1}`}
                      className="h-28 w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
              {activeImage != null && images[activeImage] && (
                <img
                  src={`${MEDIA_URL}/${images[activeImage].filepath.replace(/^uploads\//, '')}`}
                  alt="Selected evidence"
                  className="mt-3 h-72 w-full rounded-lg object-cover"
                />
              )}
            </div>
          )}

          <PriorityExplanation
            score={priorityExplanation?.score}
            priority={priorityExplanation?.priority}
            reasons={priorityExplanation?.reasons}
          />

          <div className="card p-5">
            <h2 className="mb-4 font-semibold text-slate-800">Timeline & official updates</h2>
            <StatusTimeline timeline={timeline} />
          </div>

          <Comments issueId={issue.id} />
        </div>

        <aside className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-slate-800">Take action</h2>
            <div className="flex flex-wrap gap-2">
              <VoteButton
                issueId={issue.id}
                initialVoted={myVote}
                initialCount={issue.vote_count}
              />
              <FollowButton
                issueId={issue.id}
                initialFollowed={myFollow}
                initialCount={issue.follower_count}
              />
            </div>
            {!isAuthenticated && (
              <p className="mt-3 text-xs text-slate-500">
                <a href="/auth?mode=login" className="font-medium text-brand-600">Log in</a> to vote and
                follow this issue for status updates.
              </p>
            )}
          </div>

          {issue.status === 'RESOLVED' ? (
            <div className="card p-5">
              <h2 className="mb-3 font-semibold text-emerald-700">Resolution verification</h2>
              <ResolutionVerification
                issueId={issue.id}
                myConfirmation={myConfirmation}
                onVerified={() => load()}
              />
            </div>
          ) : canOfficerAct ? (
            <OfficerActions issue={issue} onChanged={() => load()} />
          ) : null}

          <div className="card overflow-hidden">
            <div className="h-56">
              <MapContainer
                center={[Number(issue.latitude), Number(issue.longitude)]}
                zoom={15}
                className="h-full w-full"
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker
                  position={[Number(issue.latitude), Number(issue.longitude)]}
                  icon={detailIcon}
                >
                  <Popup>{issue.title}</Popup>
                </Marker>
              </MapContainer>
            </div>
            <div className="p-4 text-sm text-slate-600">
              {issue.ward ? `Ward: ${issue.ward} · ` : ''}
              Location: {issue.latitude}, {issue.longitude}
            </div>
          </div>

          <div className="card p-5">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Category</dt><dd className="font-medium">{category?.name || issue.category_name}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Severity</dt><dd className="font-medium">{category?.severity}/5</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Department</dt><dd className="font-medium">{issue.department_name || 'Not assigned'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Votes</dt><dd className="font-medium">{issue.vote_count}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Comments</dt><dd className="font-medium">{issue.comment_count}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Followers</dt><dd className="font-medium">{issue.follower_count}</dd></div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
