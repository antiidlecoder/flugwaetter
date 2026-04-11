const PRESSURE_LEVELS = [1000, 975, 950, 925, 900, 850, 800, 700, 600, 500] as const;
const ALTITUDES = Array.from({ length: 20 }, (_, i) => 600 + i * 200); // 600..4400
const DALR = 9.8; // dry adiabatic lapse rate °C/km

function interpolateTemp(
  profile: { alt: number; temp: number }[],
  altitude: number
): number | null {
  if (profile.length < 2) return null;
  if (altitude <= profile[0].alt) return profile[0].temp;
  if (altitude >= profile[profile.length - 1].alt)
    return profile[profile.length - 1].temp;

  for (let i = 0; i < profile.length - 1; i++) {
    if (altitude >= profile[i].alt && altitude <= profile[i + 1].alt) {
      const frac =
        (altitude - profile[i].alt) / (profile[i + 1].alt - profile[i].alt);
      return profile[i].temp + frac * (profile[i + 1].temp - profile[i].temp);
    }
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat") || "46.6953";
  const lon = searchParams.get("lon") || "7.7686";

  // Surface variables from MeteoSwiss high-res model
  const surfaceVars = [
    "temperature_2m",
    "cape",
    "shortwave_radiation",
    "cloud_cover",
    "cloud_cover_low",
    "cloud_cover_mid",
    "cloud_cover_high",
    "wind_speed_10m",
    "wind_direction_10m",
  ].join(",");

  // Pressure-level variables for altitude profiles
  const pressureVars = PRESSURE_LEVELS.flatMap((p) => [
    `temperature_${p}hPa`,
    `geopotential_height_${p}hPa`,
  ]).join(",");

  const [surfaceRes, pressureRes] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${surfaceVars}&models=meteoswiss_icon_ch2&timezone=Europe/Zurich&forecast_days=5`
    ),
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${pressureVars}&timezone=Europe/Zurich&forecast_days=5`
    ),
  ]);

  const surface = await surfaceRes.json();
  const pressure = await pressureRes.json();

  if (surface.error || pressure.error) {
    return Response.json(
      { error: surface.error || pressure.error },
      { status: 400 }
    );
  }

  const elevation = surface.elevation ?? 0;
  const hours = surface.hourly.time as string[];

  const data = hours.map((time: string, i: number) => {
    const T_surface = surface.hourly.temperature_2m[i] ?? 0;
    const cape = surface.hourly.cape?.[i] ?? 0;
    const radiation = surface.hourly.shortwave_radiation?.[i] ?? 0;
    const solarFactor = Math.min(radiation / 500, 1);

    // Build altitude-temperature profile from pressure levels
    const profile = PRESSURE_LEVELS.map((p) => ({
      alt: pressure.hourly[`geopotential_height_${p}hPa`]?.[i] as number,
      temp: pressure.hourly[`temperature_${p}hPa`]?.[i] as number,
    }))
      .filter((p) => p.alt != null && p.temp != null)
      .sort((a, b) => a.alt - b.alt);

    // Compute thermal velocity at each altitude level
    const thermals = ALTITUDES.map((alt) => {
      if (alt < elevation) return 0;

      const T_env = interpolateTemp(profile, alt);
      if (T_env === null) return 0;

      // Temperature of a dry-adiabatically rising parcel from the surface
      const T_parcel = T_surface - (DALR * (alt - elevation)) / 1000;
      const deltaT = T_parcel - T_env;

      if (deltaT <= 0) return 0;

      // Buoyancy-derived thermal velocity with entrainment efficiency
      let w = 1.4 * Math.sqrt(deltaT) * solarFactor;

      // CAPE boost for strong convective environments
      if (cape > 100) w *= Math.min(1 + cape / 2000, 1.5);

      return Math.round(Math.min(w, 5.0) * 2) / 2; // round to 0.5, cap at 5
    });

    return {
      time,
      thermals,
      windSpeed: Math.round(surface.hourly.wind_speed_10m?.[i] ?? 0),
      windDir: Math.round(surface.hourly.wind_direction_10m?.[i] ?? 0),
      cloudCover: Math.round(surface.hourly.cloud_cover?.[i] ?? 0),
      cloudLow: Math.round(surface.hourly.cloud_cover_low?.[i] ?? 0),
      cloudMid: Math.round(surface.hourly.cloud_cover_mid?.[i] ?? 0),
      cloudHigh: Math.round(surface.hourly.cloud_cover_high?.[i] ?? 0),
    };
  });

  return Response.json({ altitudes: ALTITUDES, elevation, hours: data });
}
