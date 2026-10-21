"use client";

import type { ComponentType } from "react";
import { GUESTS_ENTITY, HOUSE_MODE_ENTITY, houseModeKey, type HouseModeKey } from "@casa/core";
import { useCallService, useEntity } from "@casa/core/react";
import { AwayDoorIcon, GuestsIcon, HomeIcon, MoonIcon, SuitcaseIcon, SunsetIcon } from "./icons";

const ICONS: Record<HouseModeKey, ComponentType<{ size?: number }>> = {
  home: HomeIcon,
  evening: SunsetIcon,
  night: MoonIcon,
  away: AwayDoorIcon,
  vacation: SuitcaseIcon,
  other: HomeIcon,
};

/** Current house mode as a stable key ("night", "away"…), or null if HA has no mode helper. */
export function useHouseMode(): HouseModeKey | null {
  const mode = useEntity(HOUSE_MODE_ENTITY);
  if (!mode || mode.state === "unavailable" || mode.state === "unknown") return null;
  return houseModeKey(mode.state);
}

/** Mode selector (+ guests switch). Renders nothing until the helpers exist in HA. */
export function HouseMode() {
  const mode = useEntity(HOUSE_MODE_ENTITY);
  const guests = useEntity(GUESTS_ENTITY);
  const callService = useCallService();

  if (!mode) return null;
  const options = (mode.attributes.options as string[] | undefined) ?? [];
  const unavailable = mode.state === "unavailable";

  return (
    <section aria-label="Modo de la casa" className="card house-mode">
      <div className="house-mode__head">
        <span className="eyebrow">Modo</span>
        {guests && (
          <button
            type="button"
            role="switch"
            aria-checked={guests.state === "on"}
            className="guests"
            disabled={guests.state === "unavailable"}
            onClick={() => void callService("input_boolean", "toggle", {}, { entity_id: GUESTS_ENTITY })}
          >
            <GuestsIcon size={16} />
            <span>Invitados</span>
            <span className="guests__track" aria-hidden="true"><span className="guests__thumb" /></span>
          </button>
        )}
      </div>
      <div className="house-mode__options" role="radiogroup" aria-label="Modo">
        {options.map((option) => {
          const Icon = ICONS[houseModeKey(option)];
          const selected = mode.state === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              className="mode"
              disabled={unavailable}
              onClick={() => !selected && void callService("input_select", "select_option", { option }, { entity_id: HOUSE_MODE_ENTITY })}
            >
              <Icon size={20} />
              <span>{option}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
