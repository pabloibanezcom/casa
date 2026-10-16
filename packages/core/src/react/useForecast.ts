import { useEffect, useState } from "react";
import { subscribeForecast, type ForecastItem, type ForecastType } from "../weather";
import { useHA } from "./HAProvider";

export function useForecast(entityId: string | undefined, type: ForecastType): ForecastItem[] {
  const { session } = useHA();
  const [forecast, setForecast] = useState<ForecastItem[]>([]);

  useEffect(() => {
    if (!session || !entityId) return;
    const unsub = subscribeForecast(session.connection, entityId, type, setForecast);
    return () => {
      unsub.then((u) => u()).catch(() => {});
    };
  }, [session, entityId, type]);

  return forecast;
}
