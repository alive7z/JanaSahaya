import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import IssueMap from '../components/maps/IssueMap';
import { Spinner } from '../components/common/Button';
import { fetchNearby } from '../services/issues';
import { getUserLocation } from '../utils/geo';
import { DEFAULT_COORDS, DISTANCE_OPTIONS } from '../constants';

export default function Map() {
  const [params, setParams] = useSearchParams();
  const distance = Number(params.get('distance')) || 5000;
  const [center, setCenter] = useState(DEFAULT_COORDS.dehradun);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserLocation().then((p) => {
      if (p?.ok) setCenter([p.latitude, p.longitude]);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchNearby({ lat: center[0], lng: center[1], distance })
      .then(setData)
      .catch(() => setData({ issues: [] }))
      .finally(() => setLoading(false));
  }, [center, distance]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
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

      <div className="card h-[70vh] overflow-hidden p-0">
        {loading ? (
          <Spinner />
        ) : (
          <IssueMap issues={data?.issues || []} lat={center[0]} lng={center[1]} zoom={13} />
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Markers are colour-coded by priority and clustered automatically. Distances are computed
        server-side using the Haversine formula.
      </p>
    </div>
  );
}