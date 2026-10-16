"use client";

import { useEffect, useMemo, useState } from "react";
import { createApiClient } from "@casa/core";
import { useAccessToken } from "@casa/core/react";
import { dayLabel, time } from "@/lib/format";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  allDay: boolean;
}

const REFRESH_MS = 10 * 60_000;

export function Agenda() {
  const getAccessToken = useAccessToken();
  const api = useMemo(() => createApiClient({ baseUrl: "", getAccessToken }), [getAccessToken]);
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const load = () =>
      api.get<CalendarEvent[]>("/api/calendar?days=7").then(
        (e) => active && (setEvents(e), setFailed(false)),
        () => active && setFailed(true),
      );
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [api]);

  const groups = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of (events ?? []).slice(0, 8)) {
      const label = dayLabel(new Date(e.allDay ? `${e.start}T00:00` : e.start));
      map.set(label, [...(map.get(label) ?? []), e]);
    }
    return [...map];
  }, [events]);

  return (
    <section aria-label="Agenda" className="card agenda">
      {failed && !events && <p className="muted" style={{ margin: 0 }}>Calendario no conectado</p>}
      {events && groups.length === 0 && <p className="muted" style={{ margin: 0 }}>Nada en los próximos días</p>}
      {groups.map(([label, list]) => (
        <div key={label} style={{ display: "contents" }}>
          <div className="eyebrow agenda__day">{label}</div>
          {list.map((e) => (
            <div key={e.id} className={`event ${label === "Hoy" ? "event--today" : ""}`}>
              <span className="event__time num">{e.allDay ? "Día" : time(new Date(e.start))}</span>
              <span className="event__title">{e.title}</span>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
