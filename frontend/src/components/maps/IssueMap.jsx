import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
import { StatusBadge, PriorityBadge } from "../common/Badge";
import { distanceLabel, timeAgo } from "../../utils/formatters";

const iconCache = {};

function styledIcon(priority) {
  const colors = {
    LOW: "#22c55e",
    MEDIUM: "#eab308",
    HIGH: "#f97316",
    CRITICAL: "#ef4444",
  };
  const color = colors[priority] || colors.MEDIUM;
  if (iconCache[priority]) return iconCache[priority];
  iconCache[priority] = L.divIcon({
    html: `<div style="width:26px;height:26px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 7px rgba(15,23,42,.35)"></div>`,
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
  return iconCache[priority];
}

const userIcon = L.divIcon({
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#1b6ef5;border:4px solid white;box-shadow:0 0 0 3px rgba(27,110,245,.25),0 2px 8px rgba(15,23,42,.35)"></div>',
  className: "",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function Viewport({ points, fallback }) {
  const map = useMap();
  const signature = points.map((point) => point.join(",")).join("|");
  useEffect(() => {
    if (points.length > 1)
      map.fitBounds(L.latLngBounds(points), { padding: [42, 42], maxZoom: 15 });
    else if (points.length === 1) map.setView(points[0], 15);
    else map.setView(fallback, 12);
  }, [map, signature]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function IssueMap({
  issues,
  lat,
  lng,
  zoom = 12,
  currentPosition = null,
  onSelect,
}) {
  const validIssues = useMemo(
    () =>
      (issues || []).filter(
        (issue) =>
          Number.isFinite(Number(issue.latitude)) &&
          Number.isFinite(Number(issue.longitude)),
      ),
    [issues],
  );
  const points = useMemo(
    () =>
      validIssues.map((issue) => [
        Number(issue.latitude),
        Number(issue.longitude),
      ]),
    [validIssues],
  );
  const viewportPoints = useMemo(
    () =>
      currentPosition
        ? [...points, [currentPosition.latitude, currentPosition.longitude]]
        : points,
    [points, currentPosition],
  );
  const fallback = [Number(lat), Number(lng)];

  return (
    <MapContainer
      center={fallback}
      zoom={zoom}
      scrollWheelZoom
      className="h-full w-full rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Viewport points={viewportPoints} fallback={fallback} />
      {currentPosition && (
        <Marker
          position={[currentPosition.latitude, currentPosition.longitude]}
          icon={userIcon}
          zIndexOffset={1000}
        >
          <Popup>
            <span className="text-sm font-medium">You are here</span>
          </Popup>
        </Marker>
      )}
      <MarkerClusterGroup chunkedLoading>
        {validIssues.map((issue) => (
          <Marker
            key={issue.id}
            position={[Number(issue.latitude), Number(issue.longitude)]}
            icon={styledIcon(issue.priority)}
            eventHandlers={{ click: () => onSelect?.(issue.id) }}
          >
            <Popup maxWidth={320}>
              <div className="w-64 space-y-2">
                <Link
                  to={`/issue/${issue.id}`}
                  onClick={(event) => event.stopPropagation()}
                  className="block font-semibold text-slate-900 hover:text-brand-700"
                >
                  {issue.title}
                </Link>
                <p className="text-xs font-medium text-brand-700">
                  {issue.category_name || "Civic issue"}
                </p>
                <div className="flex flex-wrap gap-1">
                  <StatusBadge status={issue.status} />
                  <PriorityBadge priority={issue.priority} />
                </div>
                {issue.address && (
                  <p className="line-clamp-2 text-xs text-slate-600">
                    {issue.address}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  {issue.vote_count ?? 0} support · {timeAgo(issue.created_at)}
                </p>
                {issue.distance_metres != null && (
                  <p className="text-xs font-medium text-brand-600">
                    {distanceLabel(issue.distance_metres)} from you
                  </p>
                )}
                <Link
                  to={`/issue/${issue.id}`}
                  className="inline-block text-xs font-semibold text-brand-600"
                >
                  View Details →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
