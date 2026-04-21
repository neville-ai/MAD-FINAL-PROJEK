type LatLng = {
  latitude: number;
  longitude: number;
};

type ReverseGeocodeResponse = {
  status: string;
  results?: Array<{
    formatted_address: string;
  }>;
};
type GeolocationResponse = {
  location?: {
    lat: number;
    lng: number;
  };
  accuracy?: number;
};

const mapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const directionsApiKey = process.env.EXPO_PUBLIC_GOOGLE_DIRECTIONS_API_KEY;
const geocodingApiKey = process.env.EXPO_PUBLIC_GOOGLE_GEOCODING_API_KEY;
const placesApiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
const geolocationApiKey = process.env.EXPO_PUBLIC_GOOGLE_GEOLOCATION_API_KEY;

function resolveDirectionsApiKey() {
  return directionsApiKey || mapsApiKey || "";
}

function resolveGeocodingApiKey() {
  return geocodingApiKey || mapsApiKey || "";
}

function resolveGeolocationApiKey() {
  return geolocationApiKey || mapsApiKey || "";
}

export function getGoogleMapsApiKey() {
  return mapsApiKey ?? "";
}

export function getDirectionsApiKey() {
  return resolveDirectionsApiKey();
}

export function hasDirectionsApiKey() {
  return Boolean(resolveDirectionsApiKey());
}

export function hasGeocodingApiKey() {
  return Boolean(resolveGeocodingApiKey());
}

export function hasPlacesApiKey() {
  return Boolean(placesApiKey || mapsApiKey);
}

export function hasGeolocationApiKey() {
  return Boolean(resolveGeolocationApiKey());
}

export async function reverseGeocodeWithGoogle(coordinate: LatLng) {
  const key = resolveGeocodingApiKey();
  if (!key) {
    return null;
  }

  const params = new URLSearchParams({
    latlng: `${coordinate.latitude},${coordinate.longitude}`,
    key,
    language: "id",
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error("Gagal memanggil Google Geocoding API.");
  }

  const data = (await response.json()) as ReverseGeocodeResponse;
  if (data.status !== "OK" || !data.results || data.results.length === 0) {
    return null;
  }

  return data.results[0].formatted_address;
}

export async function geolocateWithGoogle() {
  const key = resolveGeolocationApiKey();
  if (!key) {
    return null;
  }

  const response = await fetch(
    `https://www.googleapis.com/geolocation/v1/geolocate?key=${encodeURIComponent(
      key,
    )}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        considerIp: true,
      }),
    },
  );

  if (!response.ok) {
    throw new Error("Gagal memanggil Google Geolocation API.");
  }

  const data = (await response.json()) as GeolocationResponse;
  if (!data.location) {
    return null;
  }

  return {
    latitude: data.location.lat,
    longitude: data.location.lng,
    accuracy: data.accuracy ?? null,
  };
}
