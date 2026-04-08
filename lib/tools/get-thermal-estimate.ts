import { tool, zodSchema } from "ai";
import { z } from "zod";
import { fetchForDate, getTodayZurich, pickKeyHours } from "@/lib/services/open-meteo";

// All thermal variables in one request – all available on ICON-CH2
const THERMAL_VARS = [
  "cape",
  "lifted_index",
  "convective_inhibition",
  "boundary_layer_height",
  "shortwave_radiation_instant",
  "cloud_cover_low",
  "cloud_cover_mid",
  "cloud_cover_high",
  // Pressure level vars for lapse rate calculation
  "temperature_850hPa",
  "temperature_700hPa",
  "geopotential_height_850hPa",
  "geopotential_height_700hPa",
];

const schema = z.object({
  lat: z.number().describe("Breitengrad des Ortes"),
  lon: z.number().describe("Längengrad des Ortes"),
  date: z.string().optional().describe("Datum YYYY-MM-DD – heute oder Zukunft bis +7 Tage möglich (z.B. übermorgen, Samstag). MUSS übergeben werden bei Zukunftsanfragen."),
  spotName: z.string().optional().describe("Name des Spots"),
});

type Input = z.infer<typeof schema>;

export const getThermalEstimate = tool({
  description:
    "Schätzt die Thermik-Bedingungen für einen bestimmten Ort ab. Gibt Boundary Layer Height, CAPE, Lifted Index, Convective Inhibition und Sonneneinstrahlung zurück. Verwende dies wenn der User nach Thermik fragt oder wenn eine Gesamteinschätzung nötig ist.",
  inputSchema: zodSchema(schema),
  execute: async (input: Input) => {
    console.log("[get_thermal_estimate] called with:", JSON.stringify(input));
    try {
      const { lat, lon, date, spotName } = input;
      const targetDate = date ?? getTodayZurich();

      // Single request – ICON-CH2 supports surface + pressure level vars together
      const data = await fetchForDate(lat, lon, THERMAL_VARS, "meteoswiss_icon_ch2", targetDate);
      const times = data.hourly.time as string[];
      const values = Object.fromEntries(
        Object.entries(data.hourly).filter(([k]) => k !== "time")
      ) as Record<string, (number | null)[]>;

      const hours = pickKeyHours(times, values);

      const windows = hours.map((h) => {
        const cape = h.cape as number | null;
        const li = h.lifted_index as number | null;
        const blh = h.boundary_layer_height as number | null;

        // Lapse rate: (temp_850 - temp_700) / (height_700 - height_850) * 1000 °C/km
        let lapseRate: number | null = null;
        const t850 = h.temperature_850hPa as number | null;
        const t700 = h.temperature_700hPa as number | null;
        const z700 = h.geopotential_height_700hPa as number | null;
        const z850 = h.geopotential_height_850hPa as number | null;
        if (t850 != null && t700 != null && z700 != null && z850 != null && z700 > z850) {
          lapseRate = Math.round(((t850 - t700) / (z700 - z850)) * 1000 * 10) / 10;
        }

        let bewertung = "Unbekannt";
        if (blh !== null && cape !== null && li !== null) {
          if (cape > 1000 || li < -5) {
            bewertung = "⚠️ Gewittergefahr – nicht fliegen empfohlen";
          } else if (cape > 500) {
            bewertung = "🟠 Überentwicklungsrisiko – Vorsicht";
          } else if (blh > 2500 && cape > 100 && li < -1) {
            bewertung = "✅ Sehr gute Thermik";
          } else if (blh > 2000 && li < 0) {
            bewertung = "🟢 Gute Thermik";
          } else if (blh > 1500) {
            bewertung = "🟡 Mässige Thermik";
          } else {
            bewertung = "⬜ Schwache bis keine Thermik";
          }
        }

        return {
          zeitfenster: h.label,
          boundary_layer_height_m: blh != null ? Math.round(blh) : null,
          cape_jkg: cape != null ? Math.round(cape) : null,
          lifted_index: li != null ? Math.round(li * 10) / 10 : null,
          convective_inhibition: h.convective_inhibition != null ? Math.round(h.convective_inhibition as number) : null,
          einstrahlung_wm2: h.shortwave_radiation_instant != null ? Math.round(h.shortwave_radiation_instant as number) : null,
          bewoelkung_tief_pct: h.cloud_cover_low != null ? Math.round(h.cloud_cover_low as number) : null,
          bewoelkung_mittel_pct: h.cloud_cover_mid != null ? Math.round(h.cloud_cover_mid as number) : null,
          bewoelkung_hoch_pct: h.cloud_cover_high != null ? Math.round(h.cloud_cover_high as number) : null,
          lapse_rate_c_km: lapseRate,
          bewertung,
        };
      });

      const result = {
        spot: spotName ?? `${lat}, ${lon}`,
        datum: targetDate,
        modell: "ICON-CH2",
        zeitfenster: windows,
      };
      console.log("[get_thermal_estimate] success:", result.spot, result.datum);
      return result;
    } catch (e) {
      console.error("[get_thermal_estimate] FAILED:", e);
      throw e;
    }
  },
});
