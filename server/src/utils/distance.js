/**
 * Utility for fetching coordinates (geocoding) and routing distance (driving)
 * using Google Distance Matrix API with fallback to OpenStreetMap (Nominatim + OSRM)
 * and Haversine straight-line distance.
 */

// Helper to perform fetch with a timeout
async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

/**
 * Geocode an address string to get latitude and longitude
 * Uses OpenStreetMap Nominatim API
 */
async function getCoordinates(address) {
  if (!address || !address.trim()) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address.trim())}&format=json&limit=1`;
    const response = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'PrecastCRM-DistanceAgent/1.0 (info@girprecast.com)',
        'Accept-Language': 'en'
      }
    });

    if (!response.ok) {
      console.warn(`Geocoding HTTP warning: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      };
    }
  } catch (err) {
    console.error(`Geocoding failed for address: "${address}":`, err.message);
  }
  return null;
}

/**
 * Geocode an address with progressive fallbacks (stripping left side details by comma)
 * and pin code regex matching as a last resort.
 */
async function getCoordinatesWithFallback(address) {
  if (!address || !address.trim()) return null;

  // 1. Try full address first
  let coords = await getCoordinates(address);
  if (coords) return coords;

  // 2. Progressive fallback: split by comma/newline and search from right to left
  const parts = address.split(/[,\n]/).map(p => p.trim()).filter(Boolean);
  for (let i = 1; i < parts.length; i++) {
    const fallbackAddress = parts.slice(i).join(', ');
    if (fallbackAddress.length < 5) continue;

    // Rate limit delay (1 second between attempts)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    coords = await getCoordinates(fallbackAddress);
    if (coords) {
      return coords;
    }
  }

  // 3. Last resort: extract pincode (6 digits for India)
  const pinMatch = address.match(/\b\d{6}\b/);
  if (pinMatch) {
    const pin = pinMatch[0];
    await new Promise((resolve) => setTimeout(resolve, 1000));
    coords = await getCoordinates(`${pin}, India`);
    if (coords) {
      return coords;
    }
  }

  return null;
}

/**
 * Calculate straight-line distance (Haversine formula) in kilometers
 */
function getHaversineDistance(coords1, coords2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (coords2.lat - coords1.lat) * Math.PI / 180;
  const dLon = (coords2.lon - coords1.lon) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coords1.lat * Math.PI / 180) *
    Math.cos(coords2.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return parseFloat(d.toFixed(1));
}

/**
 * Calculates the driving distance (in km) between origin and destination addresses.
 * Uses Google Distance Matrix API if GOOGLE_MAPS_API_KEY is configured.
 * Falls back to OpenStreetMap (Nominatim + OSRM) and Haversine straight-line distance.
 */
async function getDrivingDistance(origin, destination) {
  if (!origin || !destination) return null;

  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (googleApiKey && googleApiKey !== 'your_google_maps_api_key_here') {
    try {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin.trim())}&destinations=${encodeURIComponent(destination.trim())}&key=${googleApiKey}`;
      const response = await fetchWithTimeout(url, {}, 5000);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'OK' && data.rows && data.rows[0] && data.rows[0].elements && data.rows[0].elements[0]) {
          const element = data.rows[0].elements[0];
          if (element.status === 'OK' && element.distance) {
            const distanceKm = (element.distance.value / 1000).toFixed(1);
            return parseFloat(distanceKm);
          } else {
            console.warn(`Google Distance Matrix element status is not OK: "${element.status}". Falling back to OSM.`);
          }
        } else {
          console.warn(`Google Distance Matrix response status is not OK: "${data.status}". Falling back to OSM.`);
        }
      } else {
        console.warn(`Google Distance Matrix request failed: HTTP ${response.status}. Falling back to OSM.`);
      }
    } catch (err) {
      console.warn(`Google Distance Matrix API call failed (${err.message}). Falling back to OSM.`);
    }
  }

  // Fallback to OSM (Nominatim geocoding + OSRM routing)
  console.log('Using OSM (Nominatim + OSRM) for distance calculation...');

  // 1. Geocode origin address
  const originCoords = await getCoordinatesWithFallback(origin);
  if (!originCoords) {
    console.warn(`Could not geocode origin address: "${origin}"`);
    return null;
  }

  // To comply with Nominatim rate-limits (max 1 req/sec), introduce a 1-second delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 2. Geocode destination address
  const destCoords = await getCoordinatesWithFallback(destination);
  if (!destCoords) {
    console.warn(`Could not geocode destination address: "${destination}"`);
    return null;
  }

  // 3. Try to calculate driving distance using OSRM
  try {
    const routeUrl = `http://router.project-osrm.org/route/v1/driving/${originCoords.lon},${originCoords.lat};${destCoords.lon},${destCoords.lat}?overview=false`;
    const response = await fetchWithTimeout(routeUrl, {}, 5000);

    if (response.ok) {
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const distanceKm = (data.routes[0].distance / 1000).toFixed(1);
        return parseFloat(distanceKm);
      }
    }
    console.warn('OSRM routing request failed or returned empty routes, falling back to Haversine straight-line distance.');
  } catch (err) {
    console.warn(`OSRM routing failed (${err.message}). Falling back to Haversine straight-line distance.`);
  }

  // 4. Fallback to Haversine distance if OSRM was unsuccessful
  return getHaversineDistance(originCoords, destCoords);
}

module.exports = {
  getDrivingDistance
};
