const BASE_URL = "http://www.paraglidingearth.com/api/geojson";

export type WindDir = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export interface PELaunchSite {
  name: string;
  lat: number;
  lon: number;
  distanceM: number;
  altitudeM: number | null;
  description: string;
  countryCode: string;
  suitableDirections: WindDir[];
  thermals: boolean;
  soaring: boolean;
}

const WIND_DIRS: WindDir[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

function parseFeature(f: Record<string, unknown>): PELaunchSite | null {
  const p = f.properties as Record<string, string | number>;
  const geo = f.geometry as { coordinates: [number, number] };
  if (!p || !geo) return null;
  if (Number(p.paragliding) !== 1) return null;

  const suitableDirections = WIND_DIRS.filter((d) => Number(p[d]) > 0);

  return {
    name: String(p.name ?? ""),
    lat: geo.coordinates[1],
    lon: geo.coordinates[0],
    distanceM: Number(p.distance ?? 0),
    altitudeM: p.takeoff_altitude != null ? Number(p.takeoff_altitude) : null,
    description: String(p.takeoff_description ?? "").trim(),
    countryCode: String(p.countryCode ?? ""),
    suitableDirections,
    thermals: Number(p.thermals) === 1,
    soaring: Number(p.soaring) === 1,
  };
}

/**
 * Fetch paragliding launch sites around a point from paraglidingearth.com.
 * Returns only paragliding sites, ordered by distance.
 */
export async function getSitesAround(
  lat: number,
  lon: number,
  distanceKm: number,
  limit: number
): Promise<PELaunchSite[]> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lng: lon.toString(),
    distance: distanceKm.toString(),
    limit: limit.toString(),
    style: "detailled",
  });

  const url = `${BASE_URL}/getAroundLatLngSites.php?${params}`;
  console.log(`[paraglidingearth] → ${url}`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`paraglidingearth ${res.status}`);
  }

  const json = await res.json();
  const features: Record<string, unknown>[] = json.features ?? [];
  const sites = features.map(parseFeature).filter((s): s is PELaunchSite => s !== null);

  console.log(`[paraglidingearth] OK – ${sites.length} paragliding sites returned`);
  return sites;
}
