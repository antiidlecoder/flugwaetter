import { tool, zodSchema } from "ai";
import { z } from "zod";
import { fetchForDate, getTodayZurich, getHourlyRows } from "@/lib/services/open-meteo";
import { degreesToDirection } from "@/lib/utils/wind";

const MODEL_MAP: Record<string, string> = {
  "icon-ch1": "meteoswiss_icon_ch1",
  "icon-ch2": "meteoswiss_icon_ch2",
  "icon-d2": "icon_d2",
  ecmwf: "ecmwf_ifs025",
  gfs: "gfs_seamless",
};

const VARS = [
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "temperature_2m",
  "precipitation",
  "cloud_cover",
];

const schema = z.object({
  lat: z.number().describe("Breitengrad"),
  lon: z.number().describe("Längengrad"),
  date: z
    .string()
    .optional()
    .describe("Datum YYYY-MM-DD – heute oder Zukunft bis +7 Tage möglich. MUSS übergeben werden bei Zukunftsanfragen."),
  model: z
    .enum(["icon-ch1", "icon-ch2", "icon-d2", "ecmwf", "gfs"])
    .default("icon-ch2")
    .describe("Wettermodell"),
  fromHour: z.number().min(0).max(23).default(7).describe("Startzeit (default 7)"),
  toHour: z.number().min(0).max(23).default(19).describe("Endzeit (default 19)"),
  spotName: z.string().optional().describe("Name des Ortes für die Ausgabe"),
});

type Input = z.infer<typeof schema>;

export const getHourlyForecast = tool({
  description:
    "Holt eine stündliche Windprognose für einen Ort. Gibt pro Stunde Windgeschwindigkeit, Böen, Richtung, Temperatur, Niederschlag und Bewölkung zurück. Verwende dies wenn der User eine detaillierte Stunden-für-Stunden-Übersicht möchte. Unterstützt heute und Zukunftsdaten bis +7 Tage.",
  inputSchema: zodSchema(schema),
  execute: async (input: Input) => {
    console.log("[get_hourly_forecast] called with:", JSON.stringify(input));
    try {
      const { lat, lon, model, fromHour, toHour, spotName } = input;
      const date = input.date ?? getTodayZurich();
      const apiModel = MODEL_MAP[model];

      const data = await fetchForDate(lat, lon, VARS, apiModel, date);
      const times = data.hourly.time as string[];
      const values = Object.fromEntries(
        Object.entries(data.hourly).filter(([k]) => k !== "time")
      ) as Record<string, (number | null)[]>;

      const rows = getHourlyRows(times, values, fromHour, toHour);

      const num = (v: string | number | null): number | null =>
        v == null ? null : typeof v === "string" ? parseFloat(v) : v;

      const result = {
        spot: spotName ?? `${lat}, ${lon}`,
        datum: date,
        modell: model.toUpperCase(),
        stunden: rows.map((r) => ({
          uhrzeit: `${String(r.hour).padStart(2, "0")}:00`,
          wind_kmh: num(r.wind_speed_10m) != null ? Math.round(num(r.wind_speed_10m)!) : null,
          boen_kmh: num(r.wind_gusts_10m) != null ? Math.round(num(r.wind_gusts_10m)!) : null,
          windrichtung: num(r.wind_direction_10m) != null ? degreesToDirection(num(r.wind_direction_10m)!) : null,
          windrichtung_grad: num(r.wind_direction_10m) != null ? Math.round(num(r.wind_direction_10m)!) : null,
          temperatur_c: num(r.temperature_2m) != null ? Math.round(num(r.temperature_2m)! * 10) / 10 : null,
          niederschlag_mm: num(r.precipitation),
          bewoelkung_pct: num(r.cloud_cover) != null ? Math.round(num(r.cloud_cover)!) : null,
        })),
      };

      console.log(`[get_hourly_forecast] ${result.stunden.length}h for ${result.spot} on ${date}`);
      return result;
    } catch (e) {
      console.error("[get_hourly_forecast] FAILED:", e);
      throw e;
    }
  },
});
