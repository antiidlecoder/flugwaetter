const BASE_URL = "https://api.holfuy.com/live/";

export interface HolfuyWindData {
  stationId: number | string;
  wind: {
    speed: number;
    gust: number;
    direction: number;
    unit: string;
  };
  temperature: number;
  datetime?: string;
}

interface HolfuyErrorResponse {
  stationId: number | string;
  error: string;
  errorCode: string;
}

function buildParams(stationIds: string): URLSearchParams {
  const params = new URLSearchParams({
    s: stationIds,
    m: "JSON",
    tu: "C",
    su: "km/h",
  });
  // Optional token – set HOLFUY_TOKEN in .env.local to access restricted stations
  const token = process.env.HOLFUY_TOKEN;
  if (token) params.set("pw", token);
  return params;
}

function assertNoError(data: HolfuyWindData | HolfuyErrorResponse, stationId: string): asserts data is HolfuyWindData {
  if ("errorCode" in data) {
    const msg = (data as HolfuyErrorResponse).errorCode === "no_access"
      ? `Holfuy Station ${stationId}: kein Zugriff. Setze HOLFUY_TOKEN in .env.local.`
      : `Holfuy Station ${stationId}: ${(data as HolfuyErrorResponse).error}`;
    throw new Error(msg);
  }
}

export async function fetchLiveWind(stationId: string): Promise<HolfuyWindData> {
  const res = await fetch(`${BASE_URL}?${buildParams(stationId)}`);
  if (!res.ok) throw new Error(`Holfuy ${res.status}`);
  const data = await res.json();
  assertNoError(data, stationId);
  return data;
}

export async function fetchMultipleStations(stationIds: string[]): Promise<HolfuyWindData[]> {
  const res = await fetch(`${BASE_URL}?${buildParams(stationIds.join(","))}`);
  if (!res.ok) throw new Error(`Holfuy ${res.status}`);
  const data = await res.json();
  const list: (HolfuyWindData | HolfuyErrorResponse)[] = Array.isArray(data) ? data : [data];
  // Filter out stations with errors and return only successful ones
  return list.filter((d): d is HolfuyWindData => !("errorCode" in d));
}
