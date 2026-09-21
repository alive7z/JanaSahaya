import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, Search } from 'lucide-react';
import { Button } from '../common/Button';
import { geocodeAddress, getUserLocation, locationErrorText, reverseGeocode } from '../../utils/geo';
import { DEFAULT_COORDS } from '../../constants';

const pickerIcon = L.divIcon({
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#1b6ef5;border:3px solid white;box-shadow:0 1px 6px rgba(0,0,0,.5)"></div>',
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function ClickHandler({ onPick }) {
  useMapEvents({ click: (event) => onPick(event.latlng.lat, event.latlng.lng) });
  return null;
}

function Recenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo([position.latitude, position.longitude], Math.max(map.getZoom(), 15));
  }, [map, position]);
  return null;
}

export default function LocationPicker({ lat, lng, selected = false, onChange }) {
  const initial = Number.isFinite(lat) && Number.isFinite(lng)
    ? { latitude: lat, longitude: lng }
    : { latitude: DEFAULT_COORDS.dehradun[0], longitude: DEFAULT_COORDS.dehradun[1] };
  const [pos, setPos] = useState(selected ? initial : null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (selected && Number.isFinite(lat) && Number.isFinite(lng)) {
      setPos({ latitude: lat, longitude: lng });
    }
  }, [lat, lng, selected]);

  const select = (next) => {
    setPos(next);
    setError('');
    onChange?.(next);
  };

  const pickMap = async (latitude, longitude) => {
    setBusy('map');
    const address = await reverseGeocode(latitude, longitude);
    select({ latitude, longitude, ...address, locationSource: 'map' });
    setBusy('');
  };

  const locate = async () => {
    setBusy('current');
    setError('');
    const result = await getUserLocation();
    if (result?.ok) {
      const address = await reverseGeocode(result.latitude, result.longitude);
      select({ latitude: result.latitude, longitude: result.longitude, ...address, locationSource: 'current_location' });
    } else {
      setError(locationErrorText(result?.error));
    }
    setBusy('');
  };

  const search = async (event) => {
    event.preventDefault();
    if (!query.trim()) return;
    setBusy('manual');
    setError('');
    const result = await geocodeAddress(query.trim());
    if (result.ok) {
      select({ latitude: result.latitude, longitude: result.longitude, address: result.address, city: result.city, locationSource: 'manual' });
    } else {
      setError(result.error === 'not-found' ? 'No matching address was found. Add a landmark or city and try again.' : 'Address search is unavailable right now. You can still click the map.');
    }
    setBusy('');
  };

  return (
    <div className="space-y-3">
      <form className="flex gap-2" onSubmit={search}>
        <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search an address or landmark" aria-label="Search location" />
        <Button variant="secondary" type="submit" disabled={busy === 'manual' || !query.trim()}>
          <Search className="h-4 w-4" /> {busy === 'manual' ? 'Finding…' : 'Find'}
        </Button>
      </form>
      <div className="relative h-64 overflow-hidden rounded-xl ring-1 ring-slate-200">
        <MapContainer center={[initial.latitude, initial.longitude]} zoom={14} scrollWheelZoom className="h-full w-full">
          <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickHandler onPick={pickMap} />
          <Recenter position={pos} />
          {pos && <Marker position={[pos.latitude, pos.longitude]} icon={pickerIcon} />}
        </MapContainer>
        {busy === 'map' && <span className="absolute bottom-2 left-2 z-[500] rounded-lg bg-white/95 px-2 py-1 text-xs text-slate-600 shadow">Finding address…</span>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <p>{pos ? `${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}` : 'Click the map, search, or use your current location.'}</p>
        <Button variant="secondary" onClick={locate} type="button" disabled={busy === 'current'}>
          <LocateFixed className="h-4 w-4" /> {busy === 'current' ? 'Locating…' : 'Use my location'}
        </Button>
      </div>
      {pos?.address && <p className="text-xs text-slate-500">Selected: {pos.address}</p>}
      {error && <p className="text-xs text-rose-600" role="alert">{error}</p>}
    </div>
  );
}
