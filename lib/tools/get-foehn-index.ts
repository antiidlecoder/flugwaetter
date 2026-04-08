import { tool, zodSchema } from "ai";
import { z } from "zod";
import { fetchForDate, getTodayZurich, parseHour } from "@/lib/services/open-meteo";
import { FOEHN_POINTS, calculateFoehnIndex } from "@/lib/utils/foehn";

const schema = z.object({
  date: z.string().optional().describe("Datum im Format YYYY-MM-DD, default heute"),
});

type Input = z.infer<typeof schema>;

export const getFoehnIndex = tool({
  description:
    "Berechnet die aktuelle Föhntendenz für die Schweizer Alpennordseite. Gibt die Druckdifferenz Nord/Süd und eine Warnstufe zurück. Verwende dies IMMER als Teil einer Tageseinschätzung, da Föhn der grösste Risikofaktor ist.",
  inputSchema: zodSchema(schema),
  execute: async (input: Input) => {
    console.log("[get_foehn_index] called with:", JSON.stringify(input));
    try {
      const { date } = input;
      const targetDate = date ?? getTodayZurich();

      // Two locations, one request each – semaphore allows both to run concurrently
      // pressure_msl = mean sea level pressure (altitude-corrected), so the
      // difference purely reflects the meteorological N/S gradient, not elevation.
      const [nordData, suedData] = await Promise.all([
        fetchForDate(FOEHN_POINTS.nord.lat, FOEHN_POINTS.nord.lon, ["pressure_msl"], "meteoswiss_icon_ch2", targetDate),
        fetchForDate(FOEHN_POINTS.sued.lat, FOEHN_POINTS.sued.lon, ["pressure_msl"], "meteoswiss_icon_ch2", targetDate),
      ]);

      const nordPressures = nordData.hourly.pressure_msl as (number | null)[];
      const suedPressures = suedData.hourly.pressure_msl as (number | null)[];
      const times = nordData.hourly.time as string[];

      const evaluateAt = (targetHour: number, label: string) => {
        const idx = times.findIndex((t) => parseHour(t) === targetHour);
        if (idx === -1) return null;
        const np = nordPressures[idx];
        const sp = suedPressures[idx];
        if (np == null || sp == null) return null;
        return { zeitpunkt: label, ...calculateFoehnIndex(sp, np) };
      };

      const zeitfenster = [
        evaluateAt(9, "09:00"),
        evaluateAt(12, "12:00"),
        evaluateAt(15, "15:00"),
      ].filter(Boolean);

      const representative = zeitfenster.find((z) => z?.zeitpunkt === "12:00") ?? zeitfenster[0];

      const result = {
        datum: targetDate,
        referenzpunkte: {
          nord: "Altdorf (46.88°N, 8.64°E)",
          sued: "Lugano (46.00°N, 8.95°E)",
        },
        zeitfenster,
        zusammenfassung: representative
          ? {
              foehn_level: representative.level,
              druckdifferenz_hPa: Math.round(representative.pressureDiff * 10) / 10,
              warnung: representative.warning,
            }
          : { error: "Keine Daten verfügbar" },
      };
      console.log("[get_foehn_index] success – level:", result.zusammenfassung);
      return result;
    } catch (e) {
      console.error("[get_foehn_index] FAILED:", e);
      throw e;
    }
  },
});
