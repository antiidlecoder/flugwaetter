import { tool, zodSchema } from "ai";
import { z } from "zod";
import { spots, windDirectionMatrix } from "@/lib/data/spots";
import { isWindDirectionSuitable, degreesToDirection } from "@/lib/utils/wind";

const schema = z.object({
  windDirection: z
    .string()
    .optional()
    .describe("Windrichtung als Text (z.B. 'NW', 'N') oder Grad (z.B. '315')"),
  maxWindSpeed: z.number().optional().describe("Maximale Windgeschwindigkeit am Start in km/h"),
  foehnLevel: z
    .enum(["keine", "leicht", "maessig", "stark"])
    .optional()
    .describe("Aktueller Föhn-Level"),
  region: z.string().optional().describe("Region filtern z.B. 'Berner Oberland', 'Wallis'"),
});

type Input = z.infer<typeof schema>;

const levelIdx: Record<string, number> = { keine: 0, leicht: 1, maessig: 2, stark: 3 };
const exposureOrder = ["keine", "niedrig", "mittel", "hoch", "sehr hoch"];

export const getSpots = tool({
  description:
    "Findet passende Fluggebiete basierend auf den aktuellen oder prognostizierten Wetterbedingungen. Filtert nach Windrichtung, Windstärke und Föhn-Exposition. Verwende dies wenn der User allgemein fragt 'Wo kann man heute fliegen?' oder 'Welcher Spot ist gut bei Nordwind?'",
  inputSchema: zodSchema(schema),
  execute: async (input: Input) => {
    console.log("[get_spots] called with:", JSON.stringify(input));
    const { windDirection, maxWindSpeed, foehnLevel, region } = input;
    let filtered = [...spots];

    if (region) {
      filtered = filtered.filter((s) => s.region.toLowerCase().includes(region.toLowerCase()));
    }

    if (windDirection) {
      const degrees = parseFloat(windDirection);
      const dirText = !isNaN(degrees) ? degreesToDirection(degrees) : windDirection;

      const compatibleRegions = windDirectionMatrix[dirText.toUpperCase()];
      if (compatibleRegions !== undefined) {
        if (compatibleRegions.length === 0) {
          return {
            empfohlene_spots: [],
            hinweis: `Bei Windrichtung ${dirText} (Föhn!) sind keine Spots auf der Alpennordseite empfohlen.`,
            windrichtung: dirText,
          };
        }
        filtered = filtered.filter((s) => {
          const inRegion = compatibleRegions.some((r) => s.region.toLowerCase().includes(r.toLowerCase()));
          const windOk = !isNaN(degrees) && isWindDirectionSuitable(degrees, s.optimaleWindrichtung);
          return inRegion || windOk;
        });
      } else if (!isNaN(degrees)) {
        filtered = filtered.filter((s) => isWindDirectionSuitable(degrees, s.optimaleWindrichtung));
      }
    }

    if (foehnLevel && foehnLevel !== "keine") {
      const currentLevel = levelIdx[foehnLevel] ?? 0;
      filtered = filtered.filter((s) => {
        const expIdx = exposureOrder.indexOf(s.foehnExposition);
        if (currentLevel === 1) return expIdx <= 3;
        if (currentLevel === 2) return expIdx <= 2;
        if (currentLevel === 3) return expIdx <= 1;
        return true;
      });
    }

    if (maxWindSpeed !== undefined) {
      filtered = filtered.filter((s) => s.maxWindStart >= maxWindSpeed);
    }

    console.log("[get_spots] found", filtered.length, "spots");
    return {
      windrichtung: windDirection ?? "nicht angegeben",
      gefundene_spots: filtered.length,
      empfohlene_spots: filtered.map((s) => ({
        name: s.name,
        region: s.region,
        optimaleWindrichtung: s.optimaleWindrichtung.join(", "),
        maxWindStart_kmh: s.maxWindStart,
        foehnExposition: s.foehnExposition,
        thermikCharakter: s.thermikCharakter,
        saison: s.saison,
        besonderheiten: s.besonderheiten,
        koordinaten: { lat: s.startplatz.lat, lon: s.startplatz.lon },
        holfuyStation: s.holfuyStationId ?? "keine",
      })),
    };
  },
});
