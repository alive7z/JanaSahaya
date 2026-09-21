import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import { StatusBadge, PriorityBadge } from '../common/Badge';
import { distanceLabel, timeAgo } from '../../utils/formatters';
import { PRIORITY_META } from '../../constants';

const iconCache = {};

function styledIcon(priority, voting = false) {
  const colors = {
    LOW: '#15803d',
    MEDIUM: '#b45309',
    HIGH: '#c2410c',
    CRITICAL: '#be123c',
  };
  const color = colors[priority] || colors.MEDIUM;
  const size = voting ? 22 : 26;
  const key = `${priority}-${voting}`;
  if (iconCache[key]) return iconCache[key];

  const html = `
    <div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:2px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,.4);
      display:flex;align-items:center;justify-content:center;
    "></div>`;

  const icon = L.divIcon({
    html,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
  iconCache[key] = icon;
  return icon;
}

export default function IssueMap({ issues, lat, lng, zoom = 12, onSelect }) {
  if (issues == null) return null;
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={zoom}
      scrollWheelZoom={false}
      className="h-full w-full rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MarkerClusterGroup chunkedLoading>
        {issues.map((i) => (
          <Marker
            key={i.id}
            position={[Number(i.latitude), Number(i.longitude)]}
            icon={styledIcon(i.priority)}
            eventHandlers={{ click: () => onSelect?.(i.id) }}
          >
            <Popup maxWidth={300}>
              <div className="w-60">
                <Link
                  to={`/issue/${i.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-semibold text-slate-900 hover:text-brand-700"
                >
                  {i.title}
                </Link>
                <div className="mt-1 flex flex-wrap gap-1">
                  <StatusBadge status={i.status} />
                  <PriorityBadge priority={i.priority} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {i.vote_count} support · {timeAgo(i.created_at)}
                </p>
                {i.distance_metres != null && (
                  <p className="text-xs font-medium text-brand-600">{distanceLabel(i.distance_metres)} from you</p>
                )}
                <Link to={`/issue/${i.id}`} className="mt-2 inline-block text-xs font-medium text-brand-600">
                  Open issue →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}