const BASE_URL = "https://winds.mobi/api/2.3";
const USER_AGENT = "paragliding-chatbot/1.0";

export interface WindsMobiStation {
  id: string;
  name: string;
  shortName: string;
  provider: string;
  lat: number;
  lon: number;
  altM: number | null;
  peak: boolean;
  status: "green" | "orange" | "red";
  last: WindsMobiMeasure | null;
}

export interface WindsMobiMeasure {
  timestamp: number; // unix
  windDirDeg: number | null;
  windAvgKmh: number | null;
  windMaxKmh: number | null;
  tempC: number | null;
  humidityPct: number | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseStation(raw: Record<string, any>): WindsMobiStation {
  const coords: [number, number] = raw.loc?.coordinates ?? [0, 0];
  const last = raw.last
    ? {
        timestamp: raw.last._id,
        windDirDeg: raw.last["w-dir"] ?? null,
        windAvgKmh: raw.last["w-avg"] ?? null,
        windMaxKmh: raw.last["w-max"] ?? null,
        tempC: raw.last.temp ?? null,
        humidityPct: raw.last.hum ?? null,
      }
    : null;

  return {
    id: raw._id,
    name: raw.name ?? raw.short ?? raw._id,
    shortName: raw.short ?? raw.name ?? raw._id,
    provider: raw["pv-name"] ?? "",
    lat: coords[1],
    lon: coords[0],
    altM: raw.alt != null ? Number(raw.alt) : null,
    peak: raw.peak === true,
    status: raw.status ?? "red",
    last,
  };
}

/**
 * Find weather stations near a point.
 * Only returns stations with a recent measure (within the last 2 hours).
 */
export async function getStationsNear(
  lat: number,
  lon: number,
  distanceM: number,
  limit = 10
): Promise<WindsMobiStation[]> {
  const params = new URLSearchParams({
    "near-lat": lat.toString(),
    "near-lon": lon.toString(),
    "near-distance": distanceM.toString(),
    limit: limit.toString(),
    "last-measure": "7200", // only stations with data in last 2h
    status: "green",
  });

  const url = `${BASE_URL}/stations/?${params}`;
  console.log(`[windsmobi] → ${url}`);

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`winds.mobi ${res.status}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json: any[] = await res.json();
  const stations = json.map(parseStation);

  console.log(`[windsmobi] OK – ${stations.length} stations`);
  return stations;
}

/**
 * Fetch a single station by ID.
 */
export async function getStation(stationId: string): Promise<WindsMobiStation> {
  const url = `${BASE_URL}/stations/${encodeURIComponent(stationId)}/`;
  console.log(`[windsmobi] → ${url}`);

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (res.status === 404) throw new Error(`Station '${stationId}' nicht gefunden.`);
  if (!res.ok) throw new Error(`winds.mobi ${res.status}`);

  const raw = await res.json();
  return parseStation(raw);
}
