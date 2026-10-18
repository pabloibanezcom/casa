import type { HassEntities, HassEntity } from "home-assistant-js-websocket";
import type { Registries } from "./registries";

/**
 * Climate zones and system-wide controls, discovered from the registries.
 * Built against Uponor X-265 (valve, away, boiler demand entities share the
 * thermostat's device) but any climate entity becomes a zone.
 */
export interface ClimateZone {
  entityId: string;
  areaId: string | null;
  /** binary_sensor on while the zone's actuator is open. */
  valve?: string;
}

export interface ClimateSystem {
  zones: ClimateZone[];
  /** switch: whole-house away/holiday mode. */
  away?: string;
  /** binary_sensors: controller asking the boiler for heat. */
  boilerDemand: string[];
}

export function findClimateSystem(reg: Registries): ClimateSystem {
  const deviceArea = new Map(reg.devices.map((d) => [d.id, d.area_id]));
  const byDevice = new Map<string, typeof reg.entities>();
  for (const e of reg.entities) {
    if (!e.device_id || e.disabled_by) continue;
    byDevice.set(e.device_id, [...(byDevice.get(e.device_id) ?? []), e]);
  }

  const zones: ClimateZone[] = reg.entities
    .filter((e) => e.entity_id.startsWith("climate.") && !e.disabled_by && !e.hidden_by)
    .map((e) => {
      const siblings = e.device_id ? byDevice.get(e.device_id) ?? [] : [];
      const valve = siblings.find((s) => s.entity_id.startsWith("binary_sensor.") && (s.translation_key === "valve" || s.entity_id.endsWith("_valve")));
      return {
        entityId: e.entity_id,
        areaId: e.area_id ?? (e.device_id ? deviceArea.get(e.device_id) ?? null : null),
        valve: valve?.entity_id,
      };
    });

  const away = reg.entities.find((e) => e.entity_id.startsWith("switch.") && e.translation_key === "away")?.entity_id;
  const boilerDemand = reg.entities
    .filter((e) => e.entity_id.startsWith("binary_sensor.") && (e.translation_key === "boiler_demand" || e.entity_id.endsWith("_boiler_request")))
    .map((e) => e.entity_id);

  return { zones, away, boilerDemand };
}

export const isHeating = (zone: ClimateZone, states: HassEntities) => {
  const climate = states[zone.entityId];
  if (climate?.attributes.hvac_action === "heating") return true;
  return zone.valve ? states[zone.valve]?.state === "on" : false;
};

export interface Setpoint {
  value: number | null;
  min: number;
  max: number;
  step: number;
}

export function setpointOf(e: HassEntity): Setpoint {
  const n = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
  return {
    value: typeof e.attributes.temperature === "number" ? e.attributes.temperature : null,
    min: n(e.attributes.min_temp, 5),
    max: n(e.attributes.max_temp, 35),
    step: n(e.attributes.target_temp_step, 0.5),
  };
}

export const PRESET_LABELS: Record<string, string> = {
  comfort: "Confort",
  eco: "Eco",
  away: "Ausente",
  home: "En casa",
  sleep: "Noche",
  boost: "Boost",
};
