"use client";

import type { ComponentType } from "react";
import { houseModeKey, type HouseModeKey } from "@casa/core";
import { useGuestsEntity, useModeEntity } from "./modeMock";
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
  const mode = useModeEntity().entity;
  if (!mode || mode.state === "unavailable" || mode.state === "unknown") return null;
  return houseModeKey(mode.state);
}

/** Mode selector (+ guests switch). Renders nothing until the helpers exist in HA. */
export function HouseMode() {
  const { entity: mode, mocked, select } = useModeEntity();
  const { entity: guests, toggle: toggleGuests } = useGuestsEntity();

  if (!mode) return null;
  const options = (mode.attributes.options as string[] | undefined) ?? [];
  const unavailable = mode.state === "unavailable";

  return (
    <section aria-label="Modo de la casa" className="card house-mode">
      <div className="house-mode__head">
        <span className="eyebrow">
          Modo{mocked && <span className="house-mode__mock"> · simulado</span>}
        </span>
        {guests && (
          <button
            type="button"
            role="switch"
            aria-checked={guests.state === "on"}
            className="guests"
            disabled={guests.state === "unavailable"}
            onClick={() => void toggleGuests()}
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
              onClick={() => !selected && void select(option)}
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
