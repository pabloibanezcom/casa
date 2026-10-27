"use client";

import { useMemo } from "react";
import { CONDITION_LABELS, domainOf } from "@casa/core";
import { useEntities, useForecast, useHA } from "@casa/core/react";
import { degrees } from "@/lib/format";
import { WeatherIcon } from "./icons";

export function WeatherCard() {
  const { session } = useHA();
  const entities = useEntities();
  const weatherId = useMemo(() => Object.keys(entities).find((id) => domainOf(id) === "weather"), [entities]);
  const weather = weatherId ? entities[weatherId] : undefined;
  const hourly = useForecast(weatherId, "hourly");
  const daily = useForecast(weatherId, "daily");

  const today = daily[0];
  const nextHours = hourly.filter((h) => Date.parse(h.datetime) > Date.now()).slice(0, 4);
  const temp = weather?.attributes.temperature as number | undefined;

  // Indoor: average current_temperature of thermostats, per floor.
  const floors = useMemo(() => {
    if (!session) return [];
    const { registries, entityAreas } = session;
    const areaFloor = new Map(registries.areas.map((a) => [a.area_id, a.floor_id]));
    const readings = new Map<string, number[]>();
    for (const [entityId, areaId] of entityAreas) {
      if (domainOf(entityId) !== "climate") continue;
      const floorId = areaFloor.get(areaId);
      const value = Number(entities[entityId]?.attributes.current_temperature);
      if (!floorId) continue;
      const list = readings.get(floorId) ?? [];
      if (Number.isFinite(value)) list.push(value);
      readings.set(floorId, list);
    }
    const sorted = [...registries.floors].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
    return sorted.slice(0, 2).map((f) => {
      const values = readings.get(f.floor_id) ?? [];
      return {
        id: f.floor_id,
        name: f.name,
        value: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
        count: values.length,
      };
    });
  }, [session, entities]);

  return (
    <section aria-label="Tiempo" className="card weather">
      <div className="weather__top">
        <div className="weather__now">
          <div className="eyebrow">Exterior</div>
          <div className="weather__main">
            <WeatherIcon condition={weather?.state ?? "cloudy"} />
            <span className="weather__temp display num">{temp != null ? degrees(temp) : "—"}</span>
          </div>
          <div className="weather__desc">
            {weather ? CONDITION_LABELS[weather.state] ?? weather.state : "Sin datos"}
            {today?.temperature != null && today.templow != null && ` · ${Math.round(today.temperature)}/${Math.round(today.templow)}°`}
          </div>
        </div>
        {floors.map((f) => (
          <div key={f.id} className="floor-temp" title={f.count ? `Media de ${f.count} ${f.count === 1 ? "estancia" : "estancias"}` : undefined}>
            <span className="eyebrow">{f.name.replace(/^planta\s+/i, "")}</span>
            <span className="floor-temp__value display num">{f.value != null ? degrees(f.value, 1) : "—"}</span>
          </div>
        ))}
      </div>

      {nextHours.length > 0 && (
        <div className="hours">
          {nextHours.map((h) => (
            <div key={h.datetime} className="hour">
              <span className="hour__t">{new Date(h.datetime).getHours()} h</span>
              <span className="hour__temp display num">{h.temperature != null ? degrees(h.temperature) : "—"}</span>
              <span className="hour__rain">{h.precipitation_probability != null ? `${h.precipitation_probability} %` : " "}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
