"use client";

import { useEffect, useMemo, useState } from "react";
import { createApiClient } from "@casa/core";
import { useAccessToken } from "@casa/core/react";

interface PendingDevice {
  _id: string;
  name: string;
  room: string | null;
  status: "planned" | "bought";
}

/** Smoke test for the backend: HA token → Next API → Mongo. */
export function PendingDevices() {
  const getAccessToken = useAccessToken();
  const api = useMemo(() => createApiClient({ baseUrl: "", getAccessToken }), [getAccessToken]);
  const [devices, setDevices] = useState<PendingDevice[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<PendingDevice[]>("/api/devices").then(setDevices, (e: Error) => setError(e.message));
  }, [api]);

  if (error) return <p className="error">Backend: {error}</p>;
  if (!devices) return null;

  return (
    <section className="pending">
      <h2>Pendientes ({devices.length})</h2>
      <ul>
        {devices.map((d) => (
          <li key={d._id}>
            {d.name} <small>· {d.room ?? "sin estancia"} · {d.status === "bought" ? "comprado" : "por comprar"}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}
