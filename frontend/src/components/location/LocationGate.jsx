import { LocateFixed, MapPin, ShieldCheck } from 'lucide-react';
import { useLocationPermission } from '../../hooks/useLocationPermission';
import { locationErrorText } from '../../utils/geo';
import { Button, Spinner } from '../common/Button';
import Illustration from '../common/Illustration';

export default function LocationGate({ onContinue }) {
  const { status, error, request, skip } = useLocationPermission();

  return (
    <div className="relative min-h-[calc(100vh-4.5rem)] overflow-hidden bg-gradient-to-br from-white via-brand-50 to-white">
      <div className="absolute left-0 top-0 h-72 w-72 opacity-50 dot-pattern" />
      <div className="page-shell grid min-h-[calc(100vh-4.5rem)] items-center gap-8 py-10 lg:grid-cols-2">
        <div className="order-2 mx-auto w-full max-w-xl lg:order-1">
          <Illustration name="location" alt="Citizen using a phone with a map and location pin" eager className="illustration-float w-full" />
        </div>
        <div className="order-1 mx-auto w-full max-w-lg lg:order-2">
          <span className="section-kicker"><MapPin className="h-3.5 w-3.5" /> Personalise nearby issues</span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">Enable Your Location</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">Your location helps JanaSahaya accurately identify civic issues and display nearby reports.</p>

          <div className="card mt-7 p-6">
            <div className="flex gap-3 rounded-xl bg-brand-50 p-4 text-sm leading-6 text-brand-900">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <p>We only use your current position for nearby results and map placement. You can always choose a location manually.</p>
            </div>
            {status === 'locating' && <Spinner label="Getting your location…" className="py-7" />}
            {status === 'denied' && error && (
              <div className="mt-5 flex items-start gap-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
                <Illustration name="location-error" alt="Location unavailable" className="hidden w-24 shrink-0 sm:block" />
                <p className="leading-6">{locationErrorText(error)}</p>
              </div>
            )}
            <div className="mt-6 space-y-3">
              <Button className="w-full" size="lg" disabled={status === 'locating'} onClick={async () => {
                const result = await request();
                if (result?.status === 'granted') onContinue?.(result.coords);
              }}>
                <LocateFixed className="h-4 w-4" /> Allow Current Location
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => { skip(); onContinue?.(null); }}>
                Continue Without Location
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
