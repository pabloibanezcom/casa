import type { Connection } from "home-assistant-js-websocket";

export interface Area {
  area_id: string;
  name: string;
  floor_id: string | null;
  icon: string | null;
}

export interface Floor {
  floor_id: string;
  name: string;
  level: number | null;
}

export interface DeviceEntry {
  id: string;
  name: string | null;
  name_by_user: string | null;
  area_id: string | null;
  manufacturer: string | null;
  model: string | null;
}

export interface EntityEntry {
  entity_id: string;
  platform: string;
  translation_key: string | null;
  device_id: string | null;
  area_id: string | null;
  hidden_by: string | null;
  disabled_by: string | null;
  entity_category: string | null;
}

export interface Registries {
  floors: Floor[];
  areas: Area[];
  devices: DeviceEntry[];
  entities: EntityEntry[];
}

export async function fetchRegistries(conn: Connection): Promise<Registries> {
  const [floors, areas, devices, entities] = await Promise.all([
    conn.sendMessagePromise<Floor[]>({ type: "config/floor_registry/list" }),
    conn.sendMessagePromise<Area[]>({ type: "config/area_registry/list" }),
    conn.sendMessagePromise<DeviceEntry[]>({ type: "config/device_registry/list" }),
    conn.sendMessagePromise<EntityEntry[]>({ type: "config/entity_registry/list" }),
  ]);
  return { floors, areas, devices, entities };
}

/** An entity's area is its own override, falling back to its device's area. */
export function resolveEntityArea(reg: Registries): Map<string, string> {
  const deviceArea = new Map(reg.devices.map((d) => [d.id, d.area_id]));
  const result = new Map<string, string>();
  for (const e of reg.entities) {
    if (e.disabled_by || e.hidden_by || e.entity_category) continue;
    const area = e.area_id ?? (e.device_id ? deviceArea.get(e.device_id) : null);
    if (area) result.set(e.entity_id, area);
  }
  return result;
}

/** Controllable domains shown per room on the panel. */
export const CONTROL_DOMAINS = ["light", "switch", "cover", "fan", "climate", "lock"] as const;
export type ControlDomain = (typeof CONTROL_DOMAINS)[number];

export const domainOf = (entityId: string) => entityId.slice(0, entityId.indexOf("."));
