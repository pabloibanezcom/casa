"use client";

import { useMemo } from "react";
import { CONTROL_DOMAINS, domainOf, type HassEntity } from "@casa/core";
import { useCallService, useEntities, useHA } from "@casa/core/react";

const TOGGLEABLE = new Set(["light", "switch", "fan", "cover"]);
const CONTROL = new Set<string>(CONTROL_DOMAINS);

/**
 * First pass: rooms grouped by HA floor → area, with controllable entities.
 * Depends on HA areas/floors matching the 14 rooms (pending in HA).
 */
export function Rooms() {
  const { session } = useHA();
  const entities = useEntities();
  const callService = useCallService();

  const floors = useMemo(() => {
    if (!session) return [];
    const { registries, entityAreas } = session;

    const byArea = new Map<string, string[]>();
    for (const [entityId, areaId] of entityAreas) {
      if (!CONTROL.has(domainOf(entityId))) continue;
      const list = byArea.get(areaId) ?? [];
      list.push(entityId);
      byArea.set(areaId, list);
    }

    const floorList = [...registries.floors].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
    const groups = [
      ...floorList.map((f) => ({ id: f.floor_id, name: f.name })),
      { id: null as string | null, name: "Sin planta" },
    ].map((floor) => ({
      ...floor,
      areas: registries.areas
        .filter((a) => a.floor_id === floor.id && byArea.has(a.area_id))
        .sort((a, b) => a.name.localeCompare(b.name, "es"))
        .map((a) => ({ ...a, entityIds: byArea.get(a.area_id)!.sort() })),
    }));
    return groups.filter((g) => g.areas.length > 0);
  }, [session]);

  return (
    <section className="rooms">
      {floors.map((floor) => (
        <div key={floor.id ?? "none"}>
          <h2>{floor.name}</h2>
          <div className="room-grid">
            {floor.areas.map((area) => (
              <article key={area.area_id} className="room">
                <h3>{area.name}</h3>
                <ul>
                  {area.entityIds.map((id) => {
                    const entity = entities[id];
                    return entity ? (
                      <EntityRow
                        key={id}
                        entity={entity}
                        onToggle={() => void callService("homeassistant", "toggle", {}, { entity_id: id })}
                      />
                    ) : null;
                  })}
                </ul>
              </article>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function EntityRow({ entity, onToggle }: { entity: HassEntity; onToggle: () => void }) {
  const name = entity.attributes.friendly_name ?? entity.entity_id;
  const unavailable = entity.state === "unavailable";
  const on = ["on", "open", "unlocked"].includes(entity.state);

  return (
    <li className={`entity ${on ? "entity--on" : ""} ${unavailable ? "entity--unavailable" : ""}`}>
      <span>{name}</span>
      {TOGGLEABLE.has(domainOf(entity.entity_id)) && !unavailable ? (
        <button className="toggle" aria-pressed={on} onClick={onToggle}>
          {on ? "On" : "Off"}
        </button>
      ) : (
        <span className="state">{entity.state}</span>
      )}
    </li>
  );
}
