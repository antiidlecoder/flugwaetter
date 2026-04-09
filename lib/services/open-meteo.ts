import { fetchWeatherApi } from "openmeteo";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

// ---------------------------------------------------------------------------
// Semaphore – caps concurrent requests to avoid 429s on free tier
// ---------------------------------------------------------------------------
class Semaphore {
  private queue: (() => void)[] = [];
  constructor(private permits: number) {}

  acquire(): Promise<void> {
    if (this.permits > 0) { this.permits--; return Promise.resolve(); }
    return new Promise<void>((resolve) => this.queue.push(resolve));
  }

  release() {
    const next = this.queue.shift();
    if (next) { next(); } else { this.permits++; }
  }
}

const semaphore = new Semaphore(2);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface OpenMeteoResult {
  latitude: number;
  longitude: number;
  elevation: number;
  utcOffsetSeconds: number;
  hourly: {
    time: string[];
    [variable: string]: (number | null)[] | string[];
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get today's date in Europe/Zurich as YYYY-MM-DD */
export function getTodayZurich(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Zurich" });
}

/**
 * Clamp a date to a valid forecast range.
 * The forecast endpoint only goes ~7 days back – if the LLM passes a stale
 * training-data date, replace it with today.
 */
export function clampToForecastRange(date: string): string {
  const today = getTodayZurich();
  const diffDays = (new Date(today).getTime() - new Date(date).getTime()) / 86_400_000;
  if (diffDays > 7) {
    console.warn(`[open-meteo] date ${date} is too far in the past – using today (${today})`);
    return today;
  }
  return date;
}

/** Parse hour 0-23 directly from ISO string "2026-04-07T14:00" */
export function parseHour(isoTime: string): number {
  return parseInt(isoTime.split("T")[1].split(":")[0], 10);
}

export type KeyHourRow = { label: string } & Record<string, number | null | string>;
export type HourlyRow = { time: string; hour: number } & Record<string, number | null | string>;

/**
 * Return one row per hour within [fromHour, toHour] (inclusive).
 * Defaults to flying hours 7–19.
 */
export function getHourlyRows(
  times: string[],
  values: Record<string, (number | null)[]>,
  fromHour = 7,
  toHour = 19
): HourlyRow[] {
  return times
    .map((t, i) => ({ t, i, h: parseHour(t) }))
    .filter(({ h }) => h >= fromHour && h <= toHour)
    .map(({ t, i, h }) => {
      const row: HourlyRow = { time: t, hour: h };
      for (const key of Object.keys(values)) {
        row[key] = values[key][i] ?? null;
      }
      return row;
    });
}

/** Average hourly values into four named time windows */
export function pickKeyHours(
  times: string[],
  values: Record<string, (number | null)[]>
): KeyHourRow[] {
  const windows = [
    { label: "Morgen",     hours: [8, 9, 10] },
    { label: "Mittag",     hours: [11, 12, 13] },
    { label: "Nachmittag", hours: [14, 15, 16] },
    { label: "Abend",      hours: [17, 18, 19] },
  ];

  return windows.map((w): KeyHourRow => {
    const matching = times
      .map((t, i) => ({ i, h: parseHour(t) }))
      .filter(({ h }) => w.hours.includes(h));

    const row: KeyHourRow = { label: w.label };
    if (matching.length === 0) return row;

    for (const key of Object.keys(values)) {
      const vals = matching
        .map(({ i }) => values[key][i])
        .filter((v): v is number => v !== null);
      row[key] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    }
    return row;
  });
}

// ---------------------------------------------------------------------------
// Core fetch  (mirrors the openmeteo docs example)
// ---------------------------------------------------------------------------

/**
 * Fetch hourly data for a single day.
 *
 * Variable order in `variables[]` matches the FlatBuffers index –
 * variables[0] → hourly.variables(0), variables[1] → hourly.variables(1), etc.
 */
export async function fetchForDate(
  lat: number,
  lon: number,
  variables: string[],
  model: string,
  date: string
): Promise<OpenMeteoResult> {
  const safeDate = clampToForecastRange(date);

  const params = {
    latitude: lat,
    longitude: lon,
    hourly: variables,
    models: model,
    timezone: "Europe/Zurich",
    start_date: safeDate,
    end_date: safeDate,
  };

  console.log(`[open-meteo] → ${BASE_URL}`, JSON.stringify({ ...params, hourly: variables }));

  await semaphore.acquire();
  try {
    const responses = await fetchWeatherApi(BASE_URL, params);
    const response = responses[0];

    const utcOffsetSeconds = response.utcOffsetSeconds();
    const hourly = response.hourly()!;

    // Build time array (same pattern as docs example)
    const time = Array.from(
      { length: (Number(hourly.timeEnd()) - Number(hourly.time())) / hourly.interval() },
      (_, i) =>
        new Date((Number(hourly.time()) + i * hourly.interval() + utcOffsetSeconds) * 1000)
          .toISOString()
          .slice(0, 16)
    );

    // Map each variable by index – order must match the request
    const hourlyData: OpenMeteoResult["hourly"] = { time };
    variables.forEach((name, idx) => {
      const raw = hourly.variables(idx)?.valuesArray();
      hourlyData[name] = raw
        ? Array.from(raw).map((v) => (Number.isNaN(v) ? null : v))
        : [];
    });

    console.log(`[open-meteo] OK – ${time.length}h, ${variables.length} vars`);
    return {
      latitude: response.latitude(),
      longitude: response.longitude(),
      elevation: response.elevation(),
      utcOffsetSeconds,
      hourly: hourlyData,
    };
  } catch (e) {
    console.error("[open-meteo] FAILED:", e);
    throw e;
  } finally {
    semaphore.release();
  }
}

/**
 * Multi-model comparison – uses plain JSON fetch because with multiple models
 * the FlatBuffers SDK returns one response object per model, making combined
 * variable-index tracking complex. JSON is simpler for this case.
 */
export async function fetchMultiModelData(
  lat: number,
  lon: number,
  variables: string[],
  models: string[],
  date: string
): Promise<{ hourly: Record<string, (number | null)[] | string[]> }> {
  const safeDate = clampToForecastRange(date);

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: variables.join(","),
    models: models.join(","),
    timezone: "Europe/Zurich",
    start_date: safeDate,
    end_date: safeDate,
  });

  const url = `${BASE_URL}?${params}`;
  console.log(`[open-meteo] multi-model → ${url}`);

  await semaphore.acquire();
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      console.error(`[open-meteo] ERROR ${res.status}:`, body.slice(0, 200));
      throw new Error(`Open-Meteo ${res.status}`);
    }
    const json = await res.json();
    console.log(`[open-meteo] OK multi-model – ${Object.keys(json.hourly ?? {}).length} keys`);
    return json;
  } finally {
    semaphore.release();
  }
}
