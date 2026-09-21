const LOCATION_ERRORS = {
  unsupported: 'Your browser does not support location services',
  'insecure-context':
    'Your browser blocks location on this address. Open the site on http://localhost or https.',
  'permission-denied':
    'Location permission was denied. Click the location/site icon next to the address bar, allow Location, then try again.',
  'position-unavailable':
    'No location signal found. Turn on Wi-Fi or, on macOS, allow this browser in System Settings → Privacy & Security → Location Services, then relaunch the browser.',
  timeout: 'Location timed out. Try again, or click the map to set the spot.',
};

export function getUserLocation() {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ ok: false, error: 'unsupported' });
      return;
    }
    if (!window.isSecureContext) {
      resolve({ ok: false, error: 'insecure-context' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          ok: true,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      (err) => {
        const code = {
          [err?.PERMISSION_DENIED]: 'permission-denied',
          [err?.POSITION_UNAVAILABLE]: 'position-unavailable',
          [err?.TIMEOUT]: 'timeout',
        }[err?.code] || 'position-unavailable';
        resolve({ ok: false, error: code });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}

export function locationErrorText(error) {
  return LOCATION_ERRORS[error] || 'Could not determine your location.';
}

export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
    );
    const data = await res.json();
    return {
      address: data.display_name || '',
      city:
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.municipality ||
        '',
    };
  } catch {
    return { address: '', city: '' };
  }
}