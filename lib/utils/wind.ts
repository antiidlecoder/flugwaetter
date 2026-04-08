const DIRECTIONS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

export function degreesToDirection(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return DIRECTIONS[index];
}

export function isWindDirectionSuitable(windDegrees: number, optimalDirections: string[]): boolean {
  const windDir = degreesToDirection(windDegrees);
  // Check exact match and adjacent directions
  const windIndex = DIRECTIONS.indexOf(windDir);
  const candidates = [
    windDir,
    DIRECTIONS[(windIndex - 1 + 16) % 16],
    DIRECTIONS[(windIndex + 1) % 16],
  ];
  return optimalDirections.some((d) => candidates.includes(d));
}

export function calculateWindShear(
  speedLow: number,
  dirLow: number,
  speedHigh: number,
  dirHigh: number
): { speedDiff: number; dirDiff: number } {
  const speedDiff = Math.abs(speedHigh - speedLow);
  let dirDiff = Math.abs(dirHigh - dirLow);
  if (dirDiff > 180) dirDiff = 360 - dirDiff;
  return { speedDiff, dirDiff };
}
