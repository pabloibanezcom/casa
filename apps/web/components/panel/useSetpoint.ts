import { useEffect, useRef, useState } from "react";
import { setpointOf, type HassEntity } from "@casa/core";
import { useCallService } from "@casa/core/react";

const SEND_AFTER_MS = 700;
const GIVE_UP_MS = 10_000;

/**
 * Optimistic setpoint: taps update immediately and are sent to HA once the
 * user stops tapping. Falls back to HA's value if no update arrives.
 */
export function useSetpoint(entity: HassEntity) {
  const callService = useCallService();
  const { value, min, max, step } = setpointOf(entity);
  const [pending, setPending] = useState<number | null>(null);
  const sendTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const giveUpTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // HA confirmed (or changed it elsewhere): drop the local value.
  useEffect(() => {
    setPending(null);
    clearTimeout(giveUpTimer.current);
  }, [value]);

  useEffect(() => () => {
    clearTimeout(sendTimer.current);
    clearTimeout(giveUpTimer.current);
  }, []);

  const change = (direction: 1 | -1) => {
    const base = pending ?? value;
    if (base == null) return;
    const next = Math.min(max, Math.max(min, Math.round((base + direction * step) / step) * step));
    setPending(next);
    clearTimeout(sendTimer.current);
    clearTimeout(giveUpTimer.current);
    sendTimer.current = setTimeout(() => {
      void callService("climate", "set_temperature", { temperature: next }, { entity_id: entity.entity_id });
      giveUpTimer.current = setTimeout(() => setPending(null), GIVE_UP_MS);
    }, SEND_AFTER_MS);
  };

  const shown = pending ?? value;
  return {
    value: shown,
    pending: pending != null,
    canLower: shown != null && shown > min,
    canRaise: shown != null && shown < max,
    lower: () => change(-1),
    raise: () => change(1),
  };
}
