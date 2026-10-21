"use client";

import { useSyncExternalStore } from "react";
import { GUESTS_ENTITY, HOUSE_MODE_ENTITY, type HassEntity } from "@casa/core";
import { useCallService, useEntity } from "@casa/core/react";

/**
 * Until the HA helpers exist, previews and local dev simulate them in memory
 * so the mode UI can be tried out. Production never mocks: it renders nothing
 * until HA has the real helpers, and the mock steps aside as soon as they exist.
 */
const MOCK_ENABLED =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" || process.env.NODE_ENV === "development";

const MOCK_OPTIONS = ["En casa", "Tarde", "Noche", "Fuera", "Vacaciones"];

let mockState = { mode: "En casa", guests: false };
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const getSnapshot = () => mockState;
const setMock = (patch: Partial<typeof mockState>) => {
  mockState = { ...mockState, ...patch };
  listeners.forEach((l) => l());
};

function fakeEntity(entity_id: string, state: string, attributes: Record<string, unknown>): HassEntity {
  const now = new Date().toISOString();
  return {
    entity_id,
    state,
    attributes,
    last_changed: now,
    last_updated: now,
    context: { id: "mock", parent_id: null, user_id: null },
  } as HassEntity;
}

export function useModeEntity() {
  const real = useEntity(HOUSE_MODE_ENTITY);
  const callService = useCallService();
  const mock = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (real || !MOCK_ENABLED) {
    return {
      entity: real,
      mocked: false,
      select: (option: string) =>
        callService("input_select", "select_option", { option }, { entity_id: HOUSE_MODE_ENTITY }),
    };
  }
  return {
    entity: fakeEntity(HOUSE_MODE_ENTITY, mock.mode, { options: MOCK_OPTIONS }),
    mocked: true,
    select: async (option: string) => setMock({ mode: option }),
  };
}

export function useGuestsEntity() {
  const real = useEntity(GUESTS_ENTITY);
  const callService = useCallService();
  const mock = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (real || !MOCK_ENABLED) {
    return {
      entity: real,
      toggle: () => callService("input_boolean", "toggle", {}, { entity_id: GUESTS_ENTITY }),
    };
  }
  return {
    entity: fakeEntity(GUESTS_ENTITY, mock.guests ? "on" : "off", {}),
    toggle: async () => setMock({ guests: !mockState.guests }),
  };
}
