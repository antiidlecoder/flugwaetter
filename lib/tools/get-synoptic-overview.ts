import { tool, zodSchema } from "ai";
import { z } from "zod";
import { fetchForDate, getTodayZurich, parseHour } from "@/lib/services/open-meteo";
import { degreesToDirection } from "@/lib/utils/wind";

const SWISS_CENTER = { lat: 46.8, lon: 8.2 };

const SYNOPTIC_VARS = [
  "surface_pressure",
  "wind_speed_500hPa",
  "wind_direction_500hPa",
  "wind_speed_700hPa",
  "wind_direction_700hPa",
  "precipitation",
  "cloud_cover",
  "temperature_2m",
  "wind_speed_10m",
  "wind_direction_10m",
];

const schema = z.object({
  date: z.string().optional().describe("Datum YYYY-MM-DD, default heute"),
});

type Input = z.infer<typeof schema>;

export const getSynopticOverview = tool({
  description:
    "Gibt eine Übersicht über die Grosswetterlage der Schweiz. Enthält Höhenwind (500hPa/700hPa Strömungsrichtung), Niederschlag, Bewölkung. Verwende dies als ersten Schritt für eine Tageseinschätzung.",
  inputSchema: zodSchema(schema),
  execute: async (input: Input) => {
    console.log("[get_synoptic_overview] called with:", JSON.stringify(input));
    try {
      const { date } = input;
      const targetDate = date ?? getTodayZurich();

      const data = await fetchForDate(SWISS_CENTER.lat, SWISS_CENTER.lon, SYNOPTIC_VARS, "ecmwf_ifs025", targetDate);

      const times = data.hourly.time as string[];
      const h = data.hourly;

      const get = (key: string, i: number): number | null =>
        ((h[key] as (number | null)[])?.[i]) ?? null;

      const zeitfenster = times
        .map((t, i) => ({ t, i, hour: parseHour(t) }))
        .filter(({ hour }) => [6, 9, 12, 15, 18].includes(hour))
        .map(({ i, hour }) => ({
          uhrzeit: `${String(hour).padStart(2, "0")}:00`,
          bodenwind: {
            geschwindigkeit_kmh: get("wind_speed_10m", i) != null ? Math.round(get("wind_speed_10m", i)!) : null,
            richtung: get("wind_direction_10m", i) != null ? degreesToDirection(get("wind_direction_10m", i)!) : null,
          },
          hoehe_700hPa: {
            wind_kmh: get("wind_speed_700hPa", i) != null ? Math.round(get("wind_speed_700hPa", i)!) : null,
            richtung: get("wind_direction_700hPa", i) != null ? degreesToDirection(get("wind_direction_700hPa", i)!) : null,
          },
          hoehe_500hPa: {
            wind_kmh: get("wind_speed_500hPa", i) != null ? Math.round(get("wind_speed_500hPa", i)!) : null,
            richtung: get("wind_direction_500hPa", i) != null ? degreesToDirection(get("wind_direction_500hPa", i)!) : null,
          },
          niederschlag_mm: get("precipitation", i) != null ? Math.round(get("precipitation", i)! * 10) / 10 : null,
          bewoelkung_pct: get("cloud_cover", i) != null ? Math.round(get("cloud_cover", i)!) : null,
          luftdruck_hPa: get("surface_pressure", i) != null ? Math.round(get("surface_pressure", i)! * 10) / 10 : null,
        }));

      const middayIdx = times.findIndex((t) => parseHour(t) === 12);
      const dominanteStroemung =
        middayIdx !== -1 && get("wind_direction_700hPa", middayIdx) != null
          ? degreesToDirection(get("wind_direction_700hPa", middayIdx)!)
          : "unbekannt";

      const totalPrecip = zeitfenster
        .map((z) => z.niederschlag_mm)
        .filter((v): v is number => v !== null)
        .reduce((a, b) => a + b, 0);

      const result = {
        datum: targetDate,
        modell: "ECMWF IFS",
        referenzpunkt: "Zentralschweiz (46.8°N, 8.2°E)",
        dominante_stroemungsrichtung_700hPa: dominanteStroemung,
        tagesniederschlag_total_mm: Math.round(totalPrecip * 10) / 10,
        zeitfenster,
        hinweis: "Grosswetterlage basiert auf ECMWF. Für lokale Prognosen ICON-CH1/CH2 bevorzugen.",
      };
      console.log("[get_synoptic_overview] success – strömung:", dominanteStroemung, "zeitfenster:", zeitfenster.length);
      return result;
    } catch (e) {
      console.error("[get_synoptic_overview] FAILED:", e);
      throw e;
    }
  },
});
