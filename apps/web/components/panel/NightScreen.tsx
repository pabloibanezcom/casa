"use client";

import { useEffect, useMemo, useState } from "react";
import { applianceStatus, domainOf, findAppliances } from "@casa/core";
import { useEntities, useHA } from "@casa/core/react";
import { degrees, longDate, time } from "@/lib/format";
import { useHouseMode } from "./HouseMode";
import { useNow } from "./useNow";

const WAKE_MS = 5 * 60_000;
/** Only the wall panel (and big screens) dim at night; phones keep the controls. */
const PANEL_QUERY = "(min-width: 900px)";

function useIsPanel() {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(PANEL_QUERY);
    const update = () => setMatch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return match;
}

/**
 * Dark, low-glare screen while the house is in "Noche" mode: big clock,
 * outdoor temperature and only what needs attention. Tap to use the panel
 * for a few minutes; it dims again on its own.
 */
export function NightScreen() {
  const mode = useHouseMode();
  const isPanel = useIsPanel();
  const [wokeAt, setWokeAt] = useState<number | null>(null);
  const now = useNow();

  useEffect(() => {
    if (wokeAt === null) return;
    const id = setTimeout(() => setWokeAt(null), WAKE_MS - (Date.now() - wokeAt));
    return () => clearTimeout(id);
  }, [wokeAt]);

  // Leaving night mode resets the wake timer.
  useEffect(() => {
    if (mode !== "night") setWokeAt(null);
  }, [mode]);

  if (mode !== "night" || !isPanel || wokeAt !== null) return null;
  return <NightContent now={now} onWake={() => setWokeAt(Date.now())} />;
}

function NightContent({ now, onWake }: { now: Date; onWake: () => void }) {
  const { session } = useHA();
  const entities = useEntities();

  const weather = Object.values(entities).find((e) => domainOf(e.entity_id) === "weather");
  const outdoor = weather?.attributes.temperature as number | undefined;

  const notes = useMemo(() => {
    const out: { text: string; tone: "ok" | "warn" }[] = [];
    if (session) {
      for (const a of findAppliances(session.registries)) {
        const st = applianceStatus(a, entities);
        if (st.kind === "running") out.push({ text: `${a.name} en marcha`, tone: "warn" });
        if (st.kind === "finished") out.push({ text: `${a.name} terminada a las ${time(st.at)}`, tone: "warn" });
      }
    }
    const lock = Object.values(entities).find((e) => domainOf(e.entity_id) === "lock");
    if (lock) {
      out.push(lock.state === "locked" ? { text: "Puerta cerrada con llave", tone: "ok" } : { text: "Puerta sin llave", tone: "warn" });
    }
    return out;
  }, [session, entities]);

  return (
    <button type="button" className="night" onClick={onWake} aria-label="Modo noche. Toca para usar el panel">
      <span />
      <span className="night__center">
        <span className="night__time display num" suppressHydrationWarning>{time(now)}</span>
        <span className="night__date" suppressHydrationWarning>
          {longDate(now)}
          {outdoor != null && ` · ${degrees(outdoor)}`}
        </span>
      </span>
      <span className="night__notes">
        {notes.map((n) => (
          <span key={n.text} className="night__note">
            <span className={`night__dot night__dot--${n.tone}`} />
            {n.text}
          </span>
        ))}
      </span>
    </button>
  );
}
