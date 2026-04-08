"use client";

import { fetchWeatherApi } from "openmeteo";
import { useState } from "react";

const MODELS = [
  "meteoswiss_icon_ch1",
  "meteoswiss_icon_ch2",
  "icon_d2",
  "ecmwf_ifs025",
  "gfs_seamless",
];

const PRESET_VARS = [
  "temperature_2m",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "surface_pressure",
  "cape",
  "lifted_index",
  "boundary_layer_height",
  "precipitation",
  "cloud_cover",
  "wind_speed_700hPa",
  "wind_direction_700hPa",
  "wind_speed_850hPa",
  "wind_direction_850hPa",
];

interface RawResult {
  meta: {
    latitude: number;
    longitude: number;
    elevation: number;
    utcOffsetSeconds: number;
    model: string;
  };
  hourly: Record<string, (number | null)[] | string[]>;
  requestedAt: string;
}

export default function DebugPage() {
  const [lat, setLat] = useState("46.8");
  const [lon, setLon] = useState("8.2");
  const [model, setModel] = useState("meteoswiss_icon_ch2");
  const [variables, setVariables] = useState("temperature_2m,wind_speed_10m,wind_direction_10m");
  const [forecastDays, setForecastDays] = useState("1");
  const [result, setResult] = useState<RawResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchData() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const vars = variables.split(",").map((v) => v.trim()).filter(Boolean);
      const url = "https://api.open-meteo.com/v1/forecast";
      const params = {
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        hourly: vars,
        models: model,
        timezone: "Europe/Zurich",
        forecast_days: parseInt(forecastDays),
      };

      console.log("[debug] fetching", url, params);
      const responses = await fetchWeatherApi(url, params);
      const response = responses[0];

      const utcOffsetSeconds = response.utcOffsetSeconds();
      const hourly = response.hourly()!;

      const n = (Number(hourly.timeEnd()) - Number(hourly.time())) / hourly.interval();
      const times = Array.from({ length: n }, (_, i) =>
        new Date((Number(hourly.time()) + i * hourly.interval() + utcOffsetSeconds) * 1000)
          .toISOString()
          .slice(0, 16)
      );

      const hourlyData: Record<string, (number | null)[] | string[]> = { time: times };
      vars.forEach((name, idx) => {
        const raw = hourly.variables(idx)?.valuesArray();
        hourlyData[name] = raw
          ? Array.from(raw).map((v) => (Number.isNaN(v) ? null : v))
          : [];
      });

      setResult({
        meta: {
          latitude: response.latitude(),
          longitude: response.longitude(),
          elevation: response.elevation(),
          utcOffsetSeconds,
          model,
        },
        hourly: hourlyData,
        requestedAt: new Date().toISOString(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function togglePreset(v: string) {
    const current = variables.split(",").map((x) => x.trim()).filter(Boolean);
    const next = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
    setVariables(next.join(", "));
  }

  const currentVars = variables.split(",").map((x) => x.trim()).filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 font-mono">
      <h1 className="text-xl font-bold mb-1 text-sky-400">Open-Meteo Debug</h1>
      <p className="text-gray-500 text-sm mb-6">Raw API response viewer – dev only</p>

      <div className="grid grid-cols-2 gap-4 mb-4 max-w-2xl">
        <label className="flex flex-col gap-1 text-xs text-gray-400">
          Latitude
          <input
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-400">
          Longitude
          <input
            value={lon}
            onChange={(e) => setLon(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-400">
          Model
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {MODELS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-400">
          Forecast days
          <input
            type="number"
            min={1}
            max={7}
            value={forecastDays}
            onChange={(e) => setForecastDays(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </label>
      </div>

      <div className="mb-4 max-w-2xl">
        <p className="text-xs text-gray-400 mb-2">Variables (comma-separated)</p>
        <textarea
          value={variables}
          onChange={(e) => setVariables(e.target.value)}
          rows={2}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {PRESET_VARS.map((v) => (
            <button
              key={v}
              onClick={() => togglePreset(v)}
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                currentVars.includes(v)
                  ? "bg-sky-700 border-sky-500 text-white"
                  : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={fetchData}
        disabled={loading}
        className="bg-sky-600 hover:bg-sky-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-5 py-2 rounded text-sm font-medium mb-6 transition-colors"
      >
        {loading ? "Fetching…" : "Fetch raw data"}
      </button>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded p-4 mb-4 max-w-2xl text-sm text-red-300">
          <span className="font-bold">Error: </span>{error}
        </div>
      )}

      {result && (
        <div className="max-w-4xl">
          <div className="bg-gray-800 border border-gray-700 rounded p-4 mb-4 text-sm">
            <p className="text-gray-400 text-xs mb-2">Metadata</p>
            <pre className="text-green-400">{JSON.stringify(result.meta, null, 2)}</pre>
            <p className="text-gray-500 text-xs mt-2">Requested at {result.requestedAt}</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded p-4">
            <p className="text-gray-400 text-xs mb-2">
              Hourly data — {(result.hourly.time as string[]).length}h,{" "}
              {Object.keys(result.hourly).length - 1} variable(s)
            </p>
            <div className="overflow-x-auto">
              <table className="text-xs w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-gray-400 py-1 pr-4 font-normal">time</th>
                    {Object.keys(result.hourly)
                      .filter((k) => k !== "time")
                      .map((k) => (
                        <th key={k} className="text-left text-sky-400 py-1 pr-4 font-normal whitespace-nowrap">
                          {k}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {(result.hourly.time as string[]).map((t, i) => (
                    <tr key={t} className="border-b border-gray-800 hover:bg-gray-750">
                      <td className="text-gray-300 py-0.5 pr-4 whitespace-nowrap">{t}</td>
                      {Object.keys(result.hourly)
                        .filter((k) => k !== "time")
                        .map((k) => {
                          const val = (result.hourly[k] as (number | null)[])[i];
                          return (
                            <td
                              key={k}
                              className={`py-0.5 pr-4 ${val === null ? "text-gray-600" : "text-white"}`}
                            >
                              {val === null ? "—" : typeof val === "number" ? val.toFixed(1) : val}
                            </td>
                          );
                        })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
