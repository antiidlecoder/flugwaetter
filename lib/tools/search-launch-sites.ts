import { tool, zodSchema } from "ai";
import { z } from "zod";
import { getSitesAround, WindDir } from "@/lib/services/paraglidingearth";
import { degreesToDirection } from "@/lib/utils/wind";

const WIND_DIR_VALUES = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

const schema = z.object({
  lat: z.number().describe("Breitengrad des Suchzentrums"),
  lon: z.number().describe("Längengrad des Suchzentrums"),
  distance: z
    .number()
    .min(1)
    .max(200)
    .default(50)
    .describe("Suchradius in km (default 50)"),
  windDirection: z
    .enum(WIND_DIR_VALUES)
    .optional()
    .describe("Startrichtung filtern (N/NE/E/SE/S/SW/W/NW) – nur Spots die für diese Richtung geeignet sind"),
  windDegrees: z
    .number()
    .min(0)
    .max(360)
    .optional()
    .describe("Windrichtung in Grad – wird automatisch in Himmelsrichtung umgerechnet"),
  limit: z
    .number()
    .min(1)
    .max(30)
    .default(15)
    .describe("Maximale Anzahl Resultate (default 15)"),
  spotName: z.string().optional().describe("Ortsname für die Ausgabe"),
});

type Input = z.infer<typeof schema>;

export const searchLaunchSites = tool({
  description:
    "Sucht Gleitschirm-Startplätze in der Nähe eines Punktes über paraglidingearth.com. Kann nach Startrichtung filtern. Verwende dies wenn der User nach Startplätzen in einer bestimmten Region oder bei einer bestimmten Windrichtung fragt.",
  inputSchema: zodSchema(schema),
  execute: async (input: Input) => {
    console.log("[search_launch_sites] called with:", JSON.stringify(input));
    try {
      const { lat, lon, distance, windDirection, windDegrees, limit, spotName } = input;

      // Resolve wind direction
      let filterDir: WindDir | undefined = windDirection;
      if (!filterDir && windDegrees != null) {
        filterDir = degreesToDirection(windDegrees) as WindDir;
      }

      // Fetch more than requested so filtering doesn't empty the list
      const fetchLimit = filterDir ? Math.min(limit * 5, 100) : limit;
      const sites = await getSitesAround(lat, lon, distance, fetchLimit);

      // Filter by wind direction
      const filtered = filterDir
        ? sites.filter((s) => s.suitableDirections.includes(filterDir!))
        : sites;

      const results = filtered.slice(0, limit).map((s) => ({
        name: s.name,
        land: s.countryCode.toUpperCase(),
        distanz_m: s.distanceM,
        hoehe_muM: s.altitudeM,
        geeignete_windrichtungen: s.suitableDirections.length > 0 ? s.suitableDirections.join(", ") : "keine Angabe",
        thermik: s.thermals,
        soaring: s.soaring,
        beschreibung: s.description || null,
        koordinaten: { lat: s.lat, lon: s.lon },
      }));

      const result = {
        suchzentrum: spotName ?? `${lat}, ${lon}`,
        radius_km: distance,
        windfilter: filterDir ?? "keiner",
        gefunden: results.length,
        startplaetze: results,
        quelle: "paraglidingearth.com",
      };

      console.log(`[search_launch_sites] ${results.length} sites${filterDir ? ` (${filterDir} filter)` : ""}`);
      return result;
    } catch (e) {
      console.error("[search_launch_sites] FAILED:", e);
      throw e;
    }
  },
});
