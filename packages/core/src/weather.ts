import type { Connection } from "home-assistant-js-websocket";

export type ForecastType = "hourly" | "daily" | "twice_daily";

export interface ForecastItem {
  datetime: string;
  condition?: string;
  temperature?: number;
  templow?: number;
  precipitation_probability?: number;
  precipitation?: number;
}

/** HA ≥2023.9 streams forecasts over WS instead of entity attributes. */
export function subscribeForecast(
  conn: Connection,
  entityId: string,
  type: ForecastType,
  onChange: (forecast: ForecastItem[]) => void,
) {
  return conn.subscribeMessage<{ type: ForecastType; forecast: ForecastItem[] | null }>(
    (msg) => onChange(msg.forecast ?? []),
    { type: "weather/subscribe_forecast", entity_id: entityId, forecast_type: type },
  );
}

export const CONDITION_LABELS: Record<string, string> = {
  "clear-night": "Despejado",
  cloudy: "Nublado",
  exceptional: "Tiempo excepcional",
  fog: "Niebla",
  hail: "Granizo",
  lightning: "Tormenta",
  "lightning-rainy": "Tormenta con lluvia",
  partlycloudy: "Parcialmente nuboso",
  pouring: "Lluvia intensa",
  rainy: "Lluvia",
  snowy: "Nieve",
  "snowy-rainy": "Aguanieve",
  sunny: "Soleado",
  windy: "Viento",
  "windy-variant": "Viento y nubes",
};
