export { getWindForecast } from "./get-wind-forecast";
export { getThermalEstimate } from "./get-thermal-estimate";
export { getLiveWind } from "./get-live-wind";
export { getFoehnIndex } from "./get-foehn-index";
export { compareModels } from "./compare-models";
export { getSpots } from "./get-spots";
export { getSynopticOverview } from "./get-synoptic-overview";
export { searchLaunchSites } from "./search-launch-sites";
export { getHourlyForecast } from "./get-hourly-forecast";

import { getWindForecast } from "./get-wind-forecast";
import { getThermalEstimate } from "./get-thermal-estimate";
import { getLiveWind } from "./get-live-wind";
import { getFoehnIndex } from "./get-foehn-index";
import { compareModels } from "./compare-models";
import { getSpots } from "./get-spots";
import { getSynopticOverview } from "./get-synoptic-overview";
import { searchLaunchSites } from "./search-launch-sites";
import { getHourlyForecast } from "./get-hourly-forecast";

export const tools = {
  get_wind_forecast: getWindForecast,
  get_thermal_estimate: getThermalEstimate,
  get_live_wind: getLiveWind,
  get_foehn_index: getFoehnIndex,
  compare_models: compareModels,
  get_spots: getSpots,
  get_synoptic_overview: getSynopticOverview,
  search_launch_sites: searchLaunchSites,
  get_hourly_forecast: getHourlyForecast,
};
