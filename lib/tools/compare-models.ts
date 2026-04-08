import { tool, zodSchema } from "ai";
import { z } from "zod";
import { fetchMultiModelData, getTodayZurich } from "@/lib/services/open-meteo";
import { degreesToDirection } from "@/lib/utils/wind";

const MODEL_API_NAMES: Record<string, string> = {
  "icon-ch1": "meteoswiss_icon_ch1",
  "icon-ch2": "meteoswiss_icon_ch2",
  "icon-d2": "icon_d2",
  ecmwf: "ecmwf_ifs025",
  gfs: "gfs_seamless",
};

const schema = z.object({
  lat: z.number().describe("Breitengrad"),
  lon: z.number().describe("Längengrad"),
  models: z
    .array(z.enum(["icon-ch1", "icon-ch2", "icon-d2", "ecmwf", "gfs"]))
    .default(["icon-ch1", "icon-ch2", "icon-d2", "ecmwf", "gfs"])
    .describe("Zu vergleichende Modelle"),
  date: z.string().optional().describe("Datum YYYY-MM-DD, default heute"),
  spotName: z.string().optional().describe("Name des Spots"),
});

type Input = z.infer<typeof schema>;

export const compareModels = tool({
  description:
    "Vergleicht die Prognosen mehrerer Wettermodelle für einen bestimmten Ort. Gibt einen tabellarischen Vergleich und einen Konfidenz-Score zurück. Verwende dies wenn der User explizit nach einem Modellvergleich fragt oder wenn Unsicherheit besteht.",
  inputSchema: zodSchema(schema),
  execute: async (input: Input) => {
    const { lat, lon, models, date, spotName } = input;
    const targetDate = date ?? getTodayZurich();
    const apiModels = models.map((m) => MODEL_API_NAMES[m]);

    const variables = ["wind_speed_10m", "wind_direction_10m", "wind_gusts_10m", "precipitation", "cloud_cover"];

    const data = await fetchMultiModelData(lat, lon, variables, apiModels, targetDate);
    const times = data.hourly.time as string[];
    const todayIdx = times
      .map((t, i) => ({ t, i }))
      .filter(({ t, i: _ }) => [9, 12, 15].includes(parseInt(t.split("T")[1].split(":")[0], 10)));

    const comparison = models.map((model) => {
      const apiName = MODEL_API_NAMES[model];
      const speedKey = `wind_speed_10m_${apiName}`;
      const dirKey = `wind_direction_10m_${apiName}`;
      const gustKey = `wind_gusts_10m_${apiName}`;
      const precipKey = `precipitation_${apiName}`;
      const cloudKey = `cloud_cover_${apiName}`;

      const speeds = data.hourly[speedKey] as (number | null)[];
      const dirs = data.hourly[dirKey] as (number | null)[];
      const gusts = data.hourly[gustKey] as (number | null)[];

      const windows = todayIdx.map(({ t, i }) => ({
        stunde: `${parseInt(t.split("T")[1].split(":")[0], 10)}:00`,
        windgeschwindigkeit: speeds?.[i] != null ? Math.round(speeds[i]!) : null,
        windrichtung: dirs?.[i] != null ? degreesToDirection(dirs[i]!) : null,
        boen: gusts?.[i] != null ? Math.round(gusts[i]!) : null,
        niederschlag: (data.hourly[precipKey] as (number | null)[])?.[i] ?? null,
        bewoelkung:
          (data.hourly[cloudKey] as (number | null)[])?.[i] != null
            ? Math.round((data.hourly[cloudKey] as (number | null)[])[i]!)
            : null,
      }));

      return { modell: model.toUpperCase(), zeitfenster: windows };
    });

    // Confidence score based on wind speed agreement at midday
    const mittag = todayIdx.find(({ t }) => parseInt(t.split("T")[1].split(":")[0], 10) === 12);
    let konfidenz = "unbekannt";
    if (mittag) {
      const speeds = models
        .map((m) => {
          const key = `wind_speed_10m_${MODEL_API_NAMES[m]}`;
          const arr = data.hourly[key] as (number | null)[];
          return arr?.[mittag.i];
        })
        .filter((v): v is number => v !== null);

      if (speeds.length >= 2) {
        const avg = speeds.reduce((a, b) => a + b, 0) / speeds.length;
        const maxDev = Math.max(...speeds.map((s) => Math.abs(s - avg)));
        if (maxDev <= 3) konfidenz = "🟢 Hoch – Modelle stimmen überein";
        else if (maxDev <= 7) konfidenz = "🟡 Mittel – leichte Abweichungen";
        else konfidenz = "🔴 Niedrig – grosse Modellunsicherheit";
      }
    }

    return {
      spot: spotName ?? `${lat}, ${lon}`,
      datum: targetDate,
      konfidenz_score: konfidenz,
      hinweis: "ICON-CH1/CH2 (MeteoSwiss) sind für die Schweiz am zuverlässigsten.",
      modellvergleich: comparison,
    };
  },
});
