import { tool, zodSchema } from "ai";
import { z } from "zod";
import { getStationsNear, getStation } from "@/lib/services/windsmobi";
import { spots } from "@/lib/data/spots";
import { degreesToDirection } from "@/lib/utils/wind";

const schema = z.object({
  lat: z.number().optional().describe("Breitengrad des Spots (bevorzugt)"),
  lon: z.number().optional().describe("Längengrad des Spots (bevorzugt)"),
  spotName: z
    .string()
    .optional()
    .describe("Name des Spots – Koordinaten werden automatisch nachgeschlagen"),
  stationId: z
    .string()
    .optional()
    .describe("winds.mobi Station-ID direkt angeben (z.B. 'windline-4104')"),
  radiusKm: z
    .number()
    .min(1)
    .max(50)
    .default(15)
    .describe("Suchradius für nahe Stationen in km (default 15)"),
});

type Input = z.infer<typeof schema>;

function formatAge(timestamp: number): string {
  const ageMin = Math.round((Date.now() / 1000 - timestamp) / 60);
  if (ageMin < 60) return `vor ${ageMin} Min.`;
  return `vor ${Math.round(ageMin / 60)} Std.`;
}

export const getLiveWind = tool({
  description:
    "Holt aktuelle Live-Windwerte von nahe gelegenen Messstationen via winds.mobi. Gibt Windgeschwindigkeit, Böen, Richtung und Temperatur zurück. Verwende dies um Prognosen mit echten Messwerten zu vergleichen.",
  inputSchema: zodSchema(schema),
  execute: async (input: Input) => {
    console.log("[get_live_wind] called with:", JSON.stringify(input));
    try {
      const { stationId, spotName, radiusKm } = input;
      let lat = input.lat;
      let lon = input.lon;

      // Direct station ID lookup
      if (stationId) {
        const station = await getStation(stationId);
        if (!station.last) return { error: `Station ${stationId} hat keine aktuellen Daten.` };
        const m = station.last;
        return {
          stationen: [formatStation(station, m)],
          quelle: "winds.mobi",
        };
      }

      // Resolve coords from spot name
      if (!lat || !lon) {
        if (!spotName) return { error: "Bitte lat/lon oder spotName angeben." };
        const spot = spots.find(
          (s) =>
            s.name.toLowerCase().includes(spotName.toLowerCase()) ||
            spotName.toLowerCase().includes(s.name.toLowerCase())
        );
        if (!spot) return { error: `Spot '${spotName}' nicht gefunden. Bitte lat/lon angeben.` };
        lat = spot.startplatz.lat;
        lon = spot.startplatz.lon;
      }

      // Find nearby active stations
      const stations = await getStationsNear(lat, lon, radiusKm * 1000, 5);

      if (stations.length === 0) {
        return {
          error: `Keine aktiven Messstationen innerhalb von ${radiusKm} km gefunden.`,
          hinweis: "Versuche einen grösseren Radius oder prüfe winds.mobi direkt.",
        };
      }

      return {
        suchzentrum: spotName ?? `${lat}, ${lon}`,
        radius_km: radiusKm,
        stationen: stations
          .filter((s) => s.last !== null)
          .map((s) => formatStation(s, s.last!)),
        quelle: "winds.mobi",
      };
    } catch (e) {
      console.error("[get_live_wind] FAILED:", e);
      return { error: e instanceof Error ? e.message : String(e) };
    }
  },
});

function formatStation(
  s: { id: string; name: string; altM: number | null; peak: boolean; provider: string; lat: number; lon: number },
  m: { timestamp: number; windDirDeg: number | null; windAvgKmh: number | null; windMaxKmh: number | null; tempC: number | null; humidityPct: number | null }
) {
  return {
    stationId: s.id,
    name: s.name,
    anbieter: s.provider,
    hoehe_muM: s.altM,
    gipfel: s.peak,
    koordinaten: { lat: s.lat, lon: s.lon },
    messung_alter: formatAge(m.timestamp),
    windgeschwindigkeit_kmh: m.windAvgKmh,
    boen_kmh: m.windMaxKmh,
    windrichtung_grad: m.windDirDeg,
    windrichtung: m.windDirDeg != null ? degreesToDirection(m.windDirDeg) : null,
    temperatur_c: m.tempC,
    luftfeuchtigkeit_pct: m.humidityPct,
  };
}
