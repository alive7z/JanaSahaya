import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed } from 'lucide-react';
import { Button } from '../common/Button';
import { getUserLocation, locationErrorText } from '../../utils/geo';

const pickerIcon = L.divIcon({
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#1b6ef5;border:3px solid white;box-shadow:0 1px 6px rgba(0,0,0,.5)"></div>',
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
  });
  return null;
}

export default function LocationPicker({ lat, lng, onChange }) {
  const [pos, setPos] = useState({ latitude: lat, longitude: lng });
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const set = (p) => {
    setPos(p);
    setError('');
    onChange?.(p);
  };

  const locate = async () => {
    setLocating(true);
    setError('');
    const p = await getUserLocation();
    if (p?.ok) set(p);
    else setError(locationErrorText(p?.error));
    setLocating(false);
  };

  return (
    <div className="space-y-2">
      <div className="relative h-64 overflow-hidden rounded-xl ring-1 ring-slate-200">
        <MapContainer
          center={[pos.latitude, pos.longitude]}
          zoom={15}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickHandler onPick={set} />
          <Marker position={[pos.latitude, pos.longitude]} icon={pickerIcon} />
        </MapContainer>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <p>
          {pos.latitude.toFixed(6)}, {pos.longitude.toFixed(6)}
        </p>
        <Button variant="secondary" onClick={locate} type="button" disabled={locating}>
          <LocateFixed className="h-4 w-4" />
          {locating ? 'Locating…' : 'Use my location'}
        </Button>
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}