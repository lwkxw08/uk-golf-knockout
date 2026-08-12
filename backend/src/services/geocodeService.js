/**
 * Geocode a UK postcode using postcodes.io (free, no API key).
 * Returns { latitude, longitude } or null if not found.
 */
async function geocodePostcode(postcode) {
  try {
    const clean = postcode.replace(/\s+/g, '').toUpperCase();
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 200 || !data.result) return null;
    return { latitude: data.result.latitude, longitude: data.result.longitude };
  } catch {
    return null;
  }
}

/**
 * Haversine distance between two lat/lng points in miles.
 */
function haversineDistanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = { geocodePostcode, haversineDistanceMiles };
