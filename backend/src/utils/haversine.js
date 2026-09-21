const EARTH_RADIUS_KM = 6371;

export function haversine(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c * 1000; // metres
}

export function distanceInMeters(lat1, lon1, lat2, lon2) {
  return Math.round(haversine(lat1, lon1, lat2, lon2));
}

export function haversineScore(distanceMetres) {
  if (distanceMetres < 50) return 40;
  if (distanceMetres < 100) return 30;
  if (distanceMetres < 250) return 20;
  if (distanceMetres < 500) return 10;
  return 0;
}

export default haversine;