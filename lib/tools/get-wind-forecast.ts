import { tool, zodSchema } from "ai";
import { z } from "zod";
import { fetchForDate, getTodayZurich, pickKeyHours, parseHour } from "@/lib/services/open-meteo";
import { degreesToDirection } from "@/lib/utils/wind";

const MODEL_MAP: Record<string, string> = {
  "icon-ch1": "meteoswiss_icon_ch1",
  "icon-ch2": "meteoswiss_icon_ch2",
  "icon-d2": "icon_d2",
  ecmwf: "ecmwf_ifs025",
  gfs: "gfs_seamless",
};

// Surface + pressure level variables – ICON-CH2 supports both in one request
const COMBINED_VARS = [
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "temperature_2m",
  "wind_speed_850hPa",
  "wind_direction_850hPa",
  "wind_speed_700hPa",
  "wind_direction_700hPa",
  "wind_speed_500hPa",
  "wind_direction_500hPa",
];

const SURFACE_VARS = ["wind_speed_10m", "wind_direction_10m", "wind_gusts_10m", "temperature_2m"];
const PRESSURE_VARS = [
  "wind_speed_850hPa", "wind_direction_850hPa",
  "wind_speed_700hPa", "wind_direction_700hPa",
  "wind_speed_500hPa", "wind_direction_500hPa",
];

const schema = z.object({
  lat: z.number().describe("Breitengrad des Ortes"),
  lon: z.number().describe("Längengrad des Ortes"),
  model: z
    .enum(["icon-ch1", "icon-ch2", "icon-d2", "ecmwf", "gfs"])
    .default("icon-ch2")
    .describe("Wettermodell – icon-ch2 empfohlen (deckt Boden + Höhe in einer Anfrage ab)"),
  date: z.string().optional().describe("Datum im Format YYYY-MM-DD, default heute"),
  spotName: z.string().optional().describe("Name des Spots für bessere Ausgabe"),
});

type Input = z.infer<typeof schema>;

export const getWindForecast = tool({
  description:
    "Holt die Windprognose für einen bestimmten Ort. Gibt stündliche Winddaten (Geschwindigkeit, Richtung, Böen) am Boden und in der Höhe zurück. Verwende dies wenn der User nach Wind an einem bestimmten Spot fragt.",
  inputSchema: zodSchema(schema),
  execute: async (input: Input) => {
    console.log("[get_wind_forecast] called with:", JSON.stringify(input));
    try {
      const { lat, lon, model, date, spotName } = input;
      const targetDate = date ?? getTodayZurich();
      const apiModel = MODEL_MAP[model];

      // icon-ch2 supports all vars in one request; others need a separate pressure-level call
      let surfHours: ReturnType<typeof pickKeyHours>;
      let presHours: ReturnType<typeof pickKeyHours>;

      if (model === "icon-ch2" || model === "icon-d2" || model === "ecmwf" || model === "gfs") {
        const data = await fetchForDate(lat, lon, COMBINED_VARS, apiModel, targetDate);
        const times = data.hourly.time as string[];
        const values = Object.fromEntries(
          Object.entries(data.hourly).filter(([k]) => k !== "time")
        ) as Record<string, (number | null)[]>;
        surfHours = pickKeyHours(times, values);
        presHours = surfHours; // same data
      } else {
        // icon-ch1 or other: fetch surface with requested model, pressure with icon-ch2
        const [surfData, presData] = await Promise.all([
          fetchForDate(lat, lon, SURFACE_VARS, apiModel, targetDate),
          fetchForDate(lat, lon, PRESSURE_VARS, "meteoswiss_icon_ch2", targetDate),
        ]);
        const surfValues = Object.fromEntries(
          Object.entries(surfData.hourly).filter(([k]) => k !== "time")
        ) as Record<string, (number | null)[]>;
        const presValues = Object.fromEntries(
          Object.entries(presData.hourly).filter(([k]) => k !== "time")
        ) as Record<string, (number | null)[]>;
        surfHours = pickKeyHours(surfData.hourly.time as string[], surfValues);
        presHours = pickKeyHours(presData.hourly.time as string[], presValues);
      }

      const windows = surfHours.map((s, i) => {
        const p = presHours[i] ?? s;
        return {
          zeitfenster: s.label,
          boden: {
            windgeschwindigkeit_kmh: s.wind_speed_10m != null ? Math.round(s.wind_speed_10m as number) : null,
            windrichtung_grad: s.wind_direction_10m != null ? Math.round(s.wind_direction_10m as number) : null,
            windrichtung: s.wind_direction_10m != null ? degreesToDirection(s.wind_direction_10m as number) : "?",
            boen_kmh: s.wind_gusts_10m != null ? Math.round(s.wind_gusts_10m as number) : null,
            temperatur_c: s.temperature_2m != null ? Math.round(s.temperature_2m as number) : null,
          },
          hoehe: {
            wind_850hPa_kmh: p.wind_speed_850hPa != null ? Math.round(p.wind_speed_850hPa as number) : null,
            richtung_850hPa: p.wind_direction_850hPa != null ? degreesToDirection(p.wind_direction_850hPa as number) : "?",
            wind_700hPa_kmh: p.wind_speed_700hPa != null ? Math.round(p.wind_speed_700hPa as number) : null,
            richtung_700hPa: p.wind_direction_700hPa != null ? degreesToDirection(p.wind_direction_700hPa as number) : "?",
            wind_500hPa_kmh: p.wind_speed_500hPa != null ? Math.round(p.wind_speed_500hPa as number) : null,
          },
        };
      });

      const result = {
        spot: spotName ?? `${lat}, ${lon}`,
        datum: targetDate,
        modell: model.toUpperCase(),
        zeitfenster: windows,
      };
      console.log("[get_wind_forecast] success:", result.spot, result.datum);
      return result;
    } catch (e) {
      console.error("[get_wind_forecast] FAILED:", e);
      throw e;
    }
  },
});
