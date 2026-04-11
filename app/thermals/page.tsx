"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// --- Types ---

interface HourData {
  time: string;
  thermals: number[];
  windSpeed: number;
  windDir: number;
  cloudCover: number;
  cloudLow: number;
  cloudMid: number;
  cloudHigh: number;
}

interface ThermalResponse {
  altitudes: number[];
  elevation: number;
  hours: HourData[];
}

interface Location {
  name: string;
  lat: number;
  lon: number;
  elevation?: number;
  admin1?: string;
}

// --- Constants ---

const DEFAULT_LOCATIONS: Location[] = [
  { name: "Beatenberg", lat: 46.6953, lon: 7.7686 },
  { name: "Niesen", lat: 46.6451, lon: 7.6514 },
  { name: "Grindelwald", lat: 46.6243, lon: 8.0413 },
  { name: "Interlaken", lat: 46.6863, lon: 7.8632 },
];

// --- Color Scale (matching XC Therm style) ---

function getThermalColor(value: number): string {
  if (value <= 0) return "#2d2d3d";
  if (value <= 0.5) return "#3a6b6b";
  if (value <= 1.0) return "#4a9a8a";
  if (value <= 1.5) return "#6ab86a";
  if (value <= 2.0) return "#9acc5a";
  if (value <= 2.5) return "#c8dc4a";
  if (value <= 3.0) return "#e0e040";
  return "#f0f030";
}

function getTextColor(value: number): string {
  return value >= 2.0 ? "#1a1a1a" : "#e0e0e0";
}

// --- Wind direction arrow character ---

function windArrow(deg: number): string {
  // Arrow points in the direction wind is coming FROM
  const arrows = ["\u2193", "\u2199", "\u2190", "\u2196", "\u2191", "\u2197", "\u2192", "\u2198"];
  const idx = Math.round(deg / 45) % 8;
  return arrows[idx];
}

// --- Cloud symbol ---

function cloudSymbol(cover: number): string {
  if (cover < 10) return "\u00B7";
  if (cover < 30) return "\u2581";
  if (cover < 60) return "\u2584";
  if (cover < 85) return "\u2587";
  return "\u2588";
}

// --- Helper: group hours by date ---

function groupByDate(hours: HourData[]): Map<string, HourData[]> {
  const map = new Map<string, HourData[]>();
  for (const h of hours) {
    const date = h.time.slice(0, 10); // "YYYY-MM-DD"
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(h);
  }
  return map;
}

function formatDate(dateStr: string, idx: number): string {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  const day = days[d.getDay()];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const label = `${day} ${dd}.${mm}`;
  if (idx === 0) return `Heute (${label})`;
  if (idx === 1) return `Morgen (${label})`;
  return label;
}

// --- Main Component ---

export default function ThermalsPage() {
  const [location, setLocation] = useState<Location>(DEFAULT_LOCATIONS[0]);
  const [data, setData] = useState<ThermalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Fetch thermal data
  const fetchThermals = useCallback(async (loc: Location) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/thermals?lat=${loc.lat}&lon=${loc.lon}`
      );
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json: ThermalResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThermals(location);
  }, [location, fetchThermals]);

  // Geocoding search with debounce
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=6&language=de&country_code=CH`
        );
        const json = await res.json();
        if (json.results) {
          setSearchResults(
            json.results.map((r: Record<string, unknown>) => ({
              name: r.name as string,
              lat: r.latitude as number,
              lon: r.longitude as number,
              elevation: r.elevation as number,
              admin1: r.admin1 as string,
            }))
          );
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close search on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Group data by day
  const dayMap = data ? groupByDate(data.hours) : new Map();
  const dates = Array.from(dayMap.keys());
  const dayHours = dates[selectedDay]
    ? dayMap.get(dates[selectedDay])!
    : [];

  // Filter to daytime hours (6:00-21:00) for the grid
  const displayHours = dayHours.filter((h) => {
    const hour = parseInt(h.time.slice(11, 13), 10);
    return hour >= 6 && hour <= 21;
  });

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-gray-100">
      {/* Header bar */}
      <div className="bg-[#1a1a2e] border-b border-gray-700 px-4 py-3">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-bold tracking-tight">
            Thermik Vorhersage
          </h1>
          <a
            href="/"
            className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            Zum Chat
          </a>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 py-4">
        {/* Location buttons + search */}
        <div className="flex flex-wrap gap-2 items-start mb-3">
          {DEFAULT_LOCATIONS.map((loc) => (
            <button
              key={loc.name}
              onClick={() => {
                setLocation(loc);
                setSelectedDay(0);
                setShowSearch(false);
              }}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                location.name === loc.name && !showSearch
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {loc.name}
            </button>
          ))}

          {/* Search */}
          <div className="relative" ref={searchRef}>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                showSearch
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              Ort suchen
            </button>
            {showSearch && (
              <div className="absolute top-10 left-0 z-20 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-2xl min-w-[280px]">
                <input
                  type="text"
                  placeholder="z.B. Fiesch, Engelberg..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-gray-900 text-white border border-gray-600 text-sm focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
                {searchResults.length > 0 && (
                  <ul className="mt-2 space-y-0.5 max-h-[200px] overflow-y-auto">
                    {searchResults.map((r, i) => (
                      <li key={i}>
                        <button
                          onClick={() => {
                            setLocation(r);
                            setSelectedDay(0);
                            setShowSearch(false);
                            setSearchQuery("");
                            setSearchResults([]);
                          }}
                          className="w-full text-left px-3 py-2 rounded hover:bg-gray-700 text-sm transition-colors"
                        >
                          <span className="font-medium">{r.name}</span>
                          {r.admin1 && (
                            <span className="text-gray-400 ml-1">
                              ({r.admin1})
                            </span>
                          )}
                          {r.elevation != null && (
                            <span className="text-gray-500 ml-1">
                              {Math.round(r.elevation)}m
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {searchQuery.length >= 2 && searchResults.length === 0 && (
                  <p className="mt-2 text-sm text-gray-500 px-1">
                    Keine Ergebnisse
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Day selector */}
        {dates.length > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {dates.map((date, i) => (
              <button
                key={date}
                onClick={() => setSelectedDay(i)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  selectedDay === i
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {formatDate(date, i)}
              </button>
            ))}
          </div>
        )}

        {/* Info line */}
        <div className="text-xs text-gray-500 mb-3">
          <span className="font-medium text-gray-300">{location.name}</span>
          {data && (
            <>
              {" "}
              &mdash; {Math.round(data.elevation)}m u.M. &mdash;{" "}
              {location.lat.toFixed(2)}°N {location.lon.toFixed(2)}°E &mdash;
              MeteoSwiss ICON-CH2 + ICON-D2
            </>
          )}
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="text-gray-400 py-8 text-center">Lade Daten...</div>
        )}
        {error && (
          <div className="text-red-400 py-8 text-center">{error}</div>
        )}

        {/* Thermal Grid */}
        {data && !loading && displayHours.length > 0 && (
          <div className="overflow-x-auto">
            <table
              className="border-collapse text-xs font-mono"
              style={{ borderSpacing: 0 }}
            >
              <thead>
                {/* Cloud rows */}
                <tr>
                  <td className="pr-2 text-right text-gray-500 align-middle sticky left-0 bg-[#0f0f1a] z-10">
                    Wolken H
                  </td>
                  {displayHours.map((h) => (
                    <td
                      key={h.time + "ch"}
                      className="text-center px-0 py-0.5"
                      style={{ minWidth: 36 }}
                      title={`Hoch: ${h.cloudHigh}%`}
                    >
                      <span
                        style={{
                          opacity: Math.max(0.15, h.cloudHigh / 100),
                          color: "#aabbdd",
                        }}
                      >
                        {cloudSymbol(h.cloudHigh)}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="pr-2 text-right text-gray-500 align-middle sticky left-0 bg-[#0f0f1a] z-10">
                    Wolken M
                  </td>
                  {displayHours.map((h) => (
                    <td
                      key={h.time + "cm"}
                      className="text-center px-0 py-0.5"
                      title={`Mittel: ${h.cloudMid}%`}
                    >
                      <span
                        style={{
                          opacity: Math.max(0.15, h.cloudMid / 100),
                          color: "#8899bb",
                        }}
                      >
                        {cloudSymbol(h.cloudMid)}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="pr-2 text-right text-gray-500 align-middle sticky left-0 bg-[#0f0f1a] z-10">
                    Wolken T
                  </td>
                  {displayHours.map((h) => (
                    <td
                      key={h.time + "cl"}
                      className="text-center px-0 py-0.5"
                      title={`Tief: ${h.cloudLow}%`}
                    >
                      <span
                        style={{
                          opacity: Math.max(0.15, h.cloudLow / 100),
                          color: "#778899",
                        }}
                      >
                        {cloudSymbol(h.cloudLow)}
                      </span>
                    </td>
                  ))}
                </tr>
                {/* Wind row */}
                <tr>
                  <td className="pr-2 text-right text-gray-500 align-middle sticky left-0 bg-[#0f0f1a] z-10">
                    Wind
                  </td>
                  {displayHours.map((h) => (
                    <td
                      key={h.time + "w"}
                      className="text-center px-0 py-0.5"
                      title={`${h.windSpeed} km/h aus ${h.windDir}°`}
                    >
                      <span className="text-blue-300">
                        {windArrow(h.windDir)}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="pr-2 text-right text-gray-500 align-middle sticky left-0 bg-[#0f0f1a] z-10">
                    km/h
                  </td>
                  {displayHours.map((h) => (
                    <td
                      key={h.time + "ws"}
                      className="text-center px-0 py-0.5 text-gray-400"
                    >
                      {h.windSpeed}
                    </td>
                  ))}
                </tr>
                {/* Separator */}
                <tr>
                  <td
                    colSpan={displayHours.length + 1}
                    className="h-1"
                  ></td>
                </tr>
              </thead>

              <tbody>
                {/* Altitude rows — top is highest */}
                {[...data.altitudes].reverse().map((alt) => {
                  const altIdx = data.altitudes.indexOf(alt);
                  const belowGround = alt < data.elevation;
                  return (
                    <tr key={alt}>
                      <td className="pr-2 text-right text-gray-400 align-middle sticky left-0 bg-[#0f0f1a] z-10 font-medium">
                        {alt}
                      </td>
                      {displayHours.map((h) => {
                        const val = h.thermals[altIdx];
                        return (
                          <td
                            key={h.time + alt}
                            className="text-center px-0 py-0 border border-[#1a1a2e]"
                            style={{
                              backgroundColor: belowGround
                                ? "#1a1a1a"
                                : getThermalColor(val),
                              color: belowGround
                                ? "#333"
                                : getTextColor(val),
                              minWidth: 36,
                              height: 24,
                              lineHeight: "24px",
                            }}
                          >
                            {belowGround ? "" : val.toFixed(1)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>

              {/* Time labels */}
              <tfoot>
                <tr>
                  <td className="pr-2 text-right text-gray-500 sticky left-0 bg-[#0f0f1a] z-10"></td>
                  {displayHours.map((h) => {
                    const hour = h.time.slice(11, 16); // "HH:MM"
                    return (
                      <td
                        key={h.time + "t"}
                        className="text-center text-gray-400 pt-1 text-[10px]"
                      >
                        {hour}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td
                    colSpan={displayHours.length + 1}
                    className="text-center text-gray-600 pt-1 text-[10px]"
                  >
                    Zeit (Lokalzeit)
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Legend */}
        {data && !loading && (
          <div className="mt-4 flex items-center gap-1.5 text-xs text-gray-400 flex-wrap">
            <span className="mr-1">Thermik [m/s]:</span>
            {[0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5].map((v) => (
              <div
                key={v}
                className="w-8 h-5 flex items-center justify-center rounded-sm font-mono"
                style={{
                  backgroundColor: getThermalColor(v),
                  color: getTextColor(v),
                  fontSize: 10,
                }}
              >
                {v.toFixed(1)}
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <p className="mt-6 text-[10px] text-gray-600 max-w-xl">
          Thermik-Werte sind Schatzungen basierend auf Temperaturprofilen,
          Einstrahlung und CAPE. Keine Garantie — immer aktuelle Wetterdaten und
          lokale Bedingungen pruefen.
        </p>
      </div>
    </div>
  );
}
