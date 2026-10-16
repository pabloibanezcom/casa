"use client";

import { useEffect } from "react";
import { useEntity, useHA } from "@casa/core/react";
import { Agenda } from "./Agenda";
import { Clock } from "./Clock";
import { Rooms } from "./Rooms";
import { StatusStrip } from "./StatusStrip";
import { WeatherCard } from "./WeatherCard";

/** Day theme while the sun is up, dark otherwise (night mode comes next). */
function useTheme() {
  const sun = useEntity("sun.sun");
  const theme = sun?.state === "above_horizon" ? "light" : "dark";
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return theme;
}

export function Panel() {
  const { status, error } = useHA();
  const theme = useTheme();

  return (
    <div className="panel" data-theme={theme}>
      <aside className="panel__aside">
        <Clock />
        <WeatherCard />
        <Agenda />
      </aside>
      <main className="panel__main">
        {status === "error" && <p className="warn" style={{ margin: 0 }}>{error ?? "Sin conexión con Home Assistant"}</p>}
        <StatusStrip />
        <Rooms />
      </main>
    </div>
  );
}
