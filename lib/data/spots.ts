export interface Spot {
  name: string;
  region: string;
  startplatz: {
    lat: number;
    lon: number;
    elevation: number;
  };
  landeplatz?: {
    lat: number;
    lon: number;
    elevation: number;
  };
  optimaleWindrichtung: string[];
  maxWindStart: number; // km/h
  maxWindLandung: number; // km/h
  besonderheiten: string;
  saison: string;
  holfuyStationId?: string;
  thermikCharakter?: string;
  foehnExposition: "keine" | "niedrig" | "mittel" | "hoch" | "sehr hoch";
}

export const spots: Spot[] = [
  {
    name: "Niesen",
    region: "Berner Oberland",
    startplatz: { lat: 46.6467, lon: 7.6497, elevation: 2362 },
    landeplatz: { lat: 46.6225, lon: 7.6356, elevation: 628 },
    optimaleWindrichtung: ["N", "NW", "NNW"],
    maxWindStart: 25,
    maxWindLandung: 20,
    besonderheiten:
      "Klassischer NW-Spot. Föhn-gefährdet bei S/SW-Strömung. Thermische Startphase ab ca. 10:30 Uhr. Langer Flug möglich bis ins Kandertal.",
    saison: "Apr-Okt",
    holfuyStationId: "830",
    thermikCharakter: "Mittel bis stark, gute Segelstrecken möglich",
    foehnExposition: "hoch",
  },
  {
    name: "Amisbühl / Beatenberg",
    region: "Berner Oberland",
    startplatz: { lat: 46.6942, lon: 7.7833, elevation: 1150 },
    landeplatz: { lat: 46.6833, lon: 7.7667, elevation: 580 },
    optimaleWindrichtung: ["N", "NW", "NNE"],
    maxWindStart: 22,
    maxWindLandung: 18,
    besonderheiten:
      "Anfängerfreundlicher Spot am Thunersee. Gute Schulgelände-Bedingungen. Kurze Flüge möglich. Nachmittags Thermik vom See.",
    saison: "Mär-Nov",
    holfuyStationId: "455",
    thermikCharakter: "Mild bis mittel, ideal für Einsteiger",
    foehnExposition: "niedrig",
  },
  {
    name: "Planplatten",
    region: "Berner Oberland",
    startplatz: { lat: 46.7081, lon: 8.0831, elevation: 1800 },
    landeplatz: { lat: 46.6983, lon: 8.0694, elevation: 1050 },
    optimaleWindrichtung: ["NW", "W", "WNW"],
    maxWindStart: 28,
    maxWindLandung: 22,
    besonderheiten:
      "Hochalpiner Spot im Haslital. Starke Thermik ab Mittag. Überentwicklungsrisiko beachten. Gute Xcountry-Bedingungen Richtung Grosse Scheidegg.",
    saison: "Mai-Sep",
    thermikCharakter: "Stark, hochalpin",
    foehnExposition: "mittel",
  },
  {
    name: "Fiesch / Fiescheralp",
    region: "Wallis",
    startplatz: { lat: 46.4039, lon: 8.1367, elevation: 2212 },
    landeplatz: { lat: 46.3886, lon: 8.1308, elevation: 1050 },
    optimaleWindrichtung: ["W", "NW", "SW"],
    maxWindStart: 30,
    maxWindLandung: 25,
    besonderheiten:
      "Einer der besten Thermik-Spots der Schweiz. Starke Valser Wind-Systeme. Langer Gleitflug Richtung Goms möglich. Frühstart empfohlen.",
    saison: "Mai-Sep",
    holfuyStationId: "301",
    thermikCharakter: "Sehr stark, Xcountry-Paradies",
    foehnExposition: "mittel",
  },
  {
    name: "Verbier / Mont-Gelé",
    region: "Wallis",
    startplatz: { lat: 46.0956, lon: 7.2281, elevation: 3023 },
    landeplatz: { lat: 46.1136, lon: 7.2283, elevation: 1490 },
    optimaleWindrichtung: ["NW", "N", "W"],
    maxWindStart: 28,
    maxWindLandung: 22,
    besonderheiten:
      "Hochalpiner Start ab Mont-Gelé. Diverse Startvarianten. Val de Bagnes Talwind nachmittags. Gewitterrisiko beachten.",
    saison: "Jun-Sep",
    holfuyStationId: "556",
    thermikCharakter: "Stark, sehr hochalpin",
    foehnExposition: "niedrig",
  },
  {
    name: "Fronalpstock",
    region: "Zentralschweiz",
    startplatz: { lat: 46.9756, lon: 8.8406, elevation: 1922 },
    landeplatz: { lat: 47.0039, lon: 8.8578, elevation: 435 },
    optimaleWindrichtung: ["NW", "W", "N"],
    maxWindStart: 25,
    maxWindLandung: 20,
    besonderheiten:
      "Blick auf den Vierwaldstättersee. Klassisches Föhngebiet – immer Föhn-Check machen! Seewind-Effekte nachmittags. Wunderschönes Gelände.",
    saison: "Apr-Okt",
    holfuyStationId: "618",
    thermikCharakter: "Mittel, Seeeinfluss",
    foehnExposition: "sehr hoch",
  },
  {
    name: "Pilatus",
    region: "Zentralschweiz",
    startplatz: { lat: 46.9792, lon: 8.2522, elevation: 2073 },
    landeplatz: { lat: 47.0022, lon: 8.3069, elevation: 435 },
    optimaleWindrichtung: ["N", "NE", "NNW"],
    maxWindStart: 25,
    maxWindLandung: 18,
    besonderheiten:
      "Gut bei Nordwind. Steile Abfahrt, nur für erfahrene Piloten. Thermik kommt früh. Luzern-Seeggelände ideal.",
    saison: "Apr-Okt",
    holfuyStationId: "540",
    thermikCharakter: "Mittel, guter NW-Dreher",
    foehnExposition: "mittel",
  },
  {
    name: "Chäserrugg / Churfirsten",
    region: "Ostschweiz",
    startplatz: { lat: 47.1636, lon: 9.2417, elevation: 2262 },
    landeplatz: { lat: 47.1858, lon: 9.2519, elevation: 600 },
    optimaleWindrichtung: ["W", "SW", "NW"],
    maxWindStart: 28,
    maxWindLandung: 22,
    besonderheiten:
      "Hervorragend bei W-Wind. Tolle Xcountry-Strecken Richtung Appenzell. Walensee-Thermik. Wenig Föhn-Einfluss.",
    saison: "Mai-Sep",
    holfuyStationId: "402",
    thermikCharakter: "Gut bis stark",
    foehnExposition: "niedrig",
  },
  {
    name: "Engelberg / Hahnen",
    region: "Zentralschweiz",
    startplatz: { lat: 46.8217, lon: 8.4106, elevation: 1800 },
    landeplatz: { lat: 46.8194, lon: 8.4056, elevation: 1000 },
    optimaleWindrichtung: ["NW", "N", "W"],
    maxWindStart: 25,
    maxWindLandung: 20,
    besonderheiten:
      "Hochalpines Gelände. Engelberger Aa-Tal-Thermik. Föhn-Einfluss vorhanden. Kurze Saison.",
    saison: "Jun-Sep",
    thermikCharakter: "Stark hochalpin",
    foehnExposition: "hoch",
  },
  {
    name: "Rochers-de-Naye",
    region: "Westschweiz",
    startplatz: { lat: 46.4378, lon: 6.9825, elevation: 2042 },
    landeplatz: { lat: 46.4381, lon: 6.9206, elevation: 380 },
    optimaleWindrichtung: ["NE", "E", "N"],
    maxWindStart: 22,
    maxWindLandung: 18,
    besonderheiten:
      "Genfersee-Thermik klassisch. NE-Anströmung ideal. Vevey/Montreux-Lande. Frühsaison-Spot. See-Brise nachmittags.",
    saison: "Mär-Okt",
    holfuyStationId: "220",
    thermikCharakter: "Mild bis mittel, Seeeinfluss",
    foehnExposition: "keine",
  },
];

export const windDirectionMatrix: Record<string, string[]> = {
  N: ["Berner Oberland", "Zentralschweiz"],
  NW: ["Berner Oberland", "Zentralschweiz"],
  NE: ["Westschweiz", "Wallis"],
  W: ["Ostschweiz", "Wallis"],
  SW: ["Ostschweiz"],
  S: [],
  SE: ["Wallis"],
  E: ["Westschweiz", "Berner Oberland"],
};
