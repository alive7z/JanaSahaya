import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import IssueMap from '../components/maps/IssueMap';
import { Button, EmptyState, Spinner } from '../components/common/Button';
import { fetchMapIssues } from '../services/issues';
import { fetchMeta } from '../services/meta';
import { getUserLocation, locationErrorText } from '../utils/geo';
import { DEFAULT_COORDS, DISTANCE_OPTIONS, PRIORITY_META, STATUS_META } from '../constants';
import { useSocket } from '../context/SocketContext';

export default function Map() {
  const [params, setParams] = useSearchParams();
  const requestedDistance = params.get('distance') || 'all';
  const distance = DISTANCE_OPTIONS.some((option) => String(option.value) === requestedDistance) ? requestedDistance : 'all';
  const [location, setLocation] = useState({ status: 'idle', coords: null, error: '' });
  const [filters, setFilters] = useState({ status: '', category_id: '', priority: '' });
  const [meta, setMeta] = useState({ categories: [] });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const { subscribe, joinMapRoom, leaveMapRoom } = useSocket();

  const locate = useCallback(async () => {
    setLocation((current) => ({ ...current, status: 'locating', error: '' }));
    const result = await getUserLocation();
    if (result?.ok) setLocation({ status: 'ready', coords: { latitude: result.latitude, longitude: result.longitude }, error: '' });
    else setLocation({ status: 'error', coords: null, error: locationErrorText(result?.error) });
  }, []);

  useEffect(() => { fetchMeta().then(setMeta).catch(() => {}); }, []);
  useEffect(() => {
    if (distance !== 'all' && location.status === 'idle') locate();
  }, [distance, location.status, locate]);

  const load = useCallback(() => {
    if (distance !== 'all' && location.status !== 'ready') {
      setLoading(location.status === 'idle' || location.status === 'locating');
      setData(null);
      return;
    }
    const request = { distance, ...filters };
    if (!request.status) delete request.status;
    if (!request.category_id) delete request.category_id;
    if (!request.priority) delete request.priority;
    if (distance !== 'all') {
      request.lat = location.coords.latitude;
      request.lng = location.coords.longitude;
    }
    setLoading(true);
    setFailed(false);
    fetchMapIssues(request).then(setData).catch(() => { setFailed(true); setData({ issues: [], count: 0 }); }).finally(() => setLoading(false));
  }, [distance, filters, location]);

  useEffect(() => { load(); }, [load, reloadKey]);
  useEffect(() => {
    joinMapRoom();
    const refresh = () => setReloadKey((value) => value + 1);
    const unsubscribers = ['issue:update', 'issue:status', 'issue:vote'].map((event) => subscribe(event, refresh));
    return () => { unsubscribers.forEach((unsubscribe) => unsubscribe()); leaveMapRoom(); };
  }, [joinMapRoom, leaveMapRoom, subscribe]);

  const center = useMemo(() => location.coords
    ? [location.coords.latitude, location.coords.longitude]
    : DEFAULT_COORDS.dehradun, [location.coords]);
  const locationRequired = distance !== 'all' && location.status === 'error';

  return (
    <div className="page-shell py-8">
      <header className="mb-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Civic issue map</h1>
            <p className="mt-1 text-sm text-slate-600">
              {distance === 'all' ? `Showing ${data?.count ?? 0} reports across all mapped areas.` : `Showing ${data?.count ?? 0} reports within ${Number(distance) / 1000} km of your location.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {DISTANCE_OPTIONS.map((option) => (
              <button key={option.value} type="button" onClick={() => setParams({ distance: String(option.value) })} className={String(distance) === String(option.value) ? 'btn bg-brand-600 text-white hover:bg-brand-700' : 'btn-secondary'}>{option.label}</button>
            ))}
          </div>
        </div>
        <div className="card grid gap-3 p-3 sm:grid-cols-3">
          <label><span className="label">Status</span><select className="input" value={filters.status} onChange={(event) => setFilters((old) => ({ ...old, status: event.target.value }))}><option value="">All statuses</option>{Object.entries(STATUS_META).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label>
          <label><span className="label">Category</span><select className="input" value={filters.category_id} onChange={(event) => setFilters((old) => ({ ...old, category_id: event.target.value }))}><option value="">All categories</option>{meta.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label><span className="label">Priority</span><select className="input" value={filters.priority} onChange={(event) => setFilters((old) => ({ ...old, priority: event.target.value }))}><option value="">All priorities</option>{Object.entries(PRIORITY_META).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label>
        </div>
      </header>

      <div className="card min-h-[560px] overflow-hidden p-0">
        {loading ? <Spinner /> : locationRequired ? (
          <EmptyState type="location" title="Your location is needed for distance filtering" body={location.error} action={<div className="flex flex-wrap justify-center gap-2"><Button onClick={locate}>Try location again</Button><button type="button" className="btn-secondary" onClick={() => setParams({ distance: 'all' })}>Show All Issues</button></div>} className="min-h-[560px] border-0 shadow-none ring-0" />
        ) : failed ? (
          <EmptyState type="network" title="We couldn’t load the map" body="Check your connection and try again. Your filters are still saved." action={<button type="button" className="btn-primary" onClick={() => setReloadKey((value) => value + 1)}>Try again</button>} className="min-h-[560px] border-0 shadow-none ring-0" />
        ) : !data?.issues?.length ? (
          <EmptyState illustration="map-empty" title="No issues match these filters." body="Try a wider area or clear one of the filters." action={<Link to="/report" className="btn-primary">Report an Issue</Link>} className="min-h-[560px] border-0 shadow-none ring-0" />
        ) : (
          <div className="h-[70vh]"><IssueMap issues={data.issues} lat={center[0]} lng={center[1]} currentPosition={distance === 'all' ? null : location.coords} /></div>
        )}
      </div>
      <p className="mt-3 text-xs text-slate-500">Markers are colour-coded by priority and clustered automatically. Radius results use exact server-side Haversine distance after a database bounding-box query.</p>
    </div>
  );
}
