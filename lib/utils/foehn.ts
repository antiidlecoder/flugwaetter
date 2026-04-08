export const FOEHN_POINTS = {
  nord: { lat: 46.88, lon: 8.64 }, // Altdorf
  sued: { lat: 46.0, lon: 8.95 },  // Lugano
};

export type FoehnLevel = "keine" | "leicht" | "maessig" | "stark";

export function calculateFoehnIndex(
  pressureSouth: number,
  pressureNorth: number
): { level: FoehnLevel; pressureDiff: number; warning: string } {
  const pressureDiff = pressureSouth - pressureNorth;

  if (pressureDiff < 2) {
    return {
      level: "keine",
      pressureDiff,
      warning: "🟢 Kein Föhn – alle Spots auf der Alpennordseite möglich",
    };
  } else if (pressureDiff < 4) {
    return {
      level: "leicht",
      pressureDiff,
      warning: "🟡 Leichte Föhntendenz – Vorsicht an exponierten Spots (Niesen, Fronalpstock, Engelberg)",
    };
  } else if (pressureDiff < 6) {
    return {
      level: "maessig",
      pressureDiff,
      warning: "🟠 Mässiger Föhn – nur geschützte Spots (Wallis-Südseite, Tessin). Alpennordseite meiden.",
    };
  } else {
    return {
      level: "stark",
      pressureDiff,
      warning: "🔴 Starker Föhn – Nicht fliegen auf der Alpennordseite! Extreme Turbulenz möglich.",
    };
  }
}
