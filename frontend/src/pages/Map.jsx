import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import IssueMap from '../components/maps/IssueMap';
import { Link } from 'react-router-dom';
import { EmptyState, Spinner } from '../components/common/Button';
import { fetchNearby } from '../services/issues';
import { getUserLocation } from '../utils/geo';
import { DEFAULT_COORDS, DISTANCE_OPTIONS } from '../constants';

export default function Map() {
  const [params, setParams] = useSearchParams();
  const distance = Number(params.get('distance')) || 5000;
  const [center, setCenter] = useState(DEFAULT_COORDS.dehradun);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getUserLocation().then((p) => {
      if (p?.ok) setCenter([p.latitude, p.longitude]);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    setFailed(false);
    fetchNearby({ lat: center[0], lng: center[1], distance })
      .then(setData)
      .catch(() => { setFailed(true); setData({ issues: [] }); })
      .finally(() => setLoading(false));
  }, [center, distance]);

  return (
    <div className="page-shell py-8">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Civic issue map</h1>
          <p className="mt-1 text-sm text-slate-600">
            Showing open issues around {center[0].toFixed(3)}, {center[1].toFixed(3)}.
            {data && ` · ${data.count} within ${data.radius} m`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {DISTANCE_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setParams({ distance: String(o.value) })}
              className={
                distance === o.value
                  ? 'btn bg-brand-600 text-white hover:bg-brand-700'
                  : 'btn-secondary'
              }
            >
              {o.label}
            </button>
          ))}
        </div>
      </header>

      <div className="card min-h-[560px] overflow-hidden p-0">
        {loading ? (
          <Spinner />
        ) : failed ? (
          <EmptyState
            type="network"
            title="We couldn’t load the map"
            body="Check your connection and try again. Your filters are still saved."
            action={<button type="button" className="btn-primary" onClick={() => setCenter((value) => [...value])}>Try again</button>}
            className="min-h-[560px] border-0 shadow-none ring-0"
          />
        ) : !data?.issues?.length ? (
          <EmptyState
            illustration="map-empty"
            title="No issues found nearby."
            body="Looks like things are clear around this area."
            action={<Link to="/report" className="btn-primary">Report an Issue</Link>}
            className="min-h-[560px] border-0 shadow-none ring-0"
          />
        ) : (
          <div className="h-[70vh]"><IssueMap issues={data.issues} lat={center[0]} lng={center[1]} zoom={13} /></div>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Markers are colour-coded by priority and clustered automatically. Distances are computed
        server-side using the Haversine formula.
      </p>
    </div>
  );
}
