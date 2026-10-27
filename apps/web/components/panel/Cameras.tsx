"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { domainOf, type HassEntity } from "@casa/core";
import { useEntities, useHA } from "@casa/core/react";
import { CameraIcon, CloseIcon } from "./icons";

const SNAPSHOT_EVERY = 8_000;

export function useCameras(): HassEntity[] {
  const entities = useEntities();
  return useMemo(
    () =>
      Object.values(entities)
        .filter((e) => domainOf(e.entity_id) === "camera")
        .sort((a, b) => cameraName(a).localeCompare(cameraName(b), "es")),
    [entities],
  );
}

/** "Camara_Andres" → "Andres", "Camara Jardin" → "Jardín"-style short names. */
export function cameraName(e: HassEntity) {
  const full = String(e.attributes.friendly_name ?? e.entity_id).replace(/_/g, " ").trim();
  const short = full.replace(/^c[aá]mara\s+/i, "").trim();
  const name = short || full;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function useHassUrl() {
  const { session } = useHA();
  return session?.auth.data.hassUrl ?? "";
}

/** Page visible = keep refreshing; hidden tab = stop, so a wall panel that's asleep doesn't hammer the cameras. */
function useTick(ms: number) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) setTick((t) => t + 1);
    }, ms);
    return () => clearInterval(id);
  }, [ms]);
  return tick;
}

export function Cameras() {
  const cameras = useCameras();
  const [openId, setOpenId] = useState<string | null>(null);
  const tick = useTick(SNAPSHOT_EVERY);
  const opened = cameras.find((c) => c.entity_id === openId);

  return (
    <section role="tabpanel" aria-label="Cámaras" className="cameras">
      {cameras.map((c) => (
        <CameraTile key={c.entity_id} camera={c} tick={tick} onOpen={() => setOpenId(c.entity_id)} />
      ))}
      {opened && <CameraDialog camera={opened} onClose={() => setOpenId(null)} />}
    </section>
  );
}

function CameraTile({ camera, tick, onOpen }: { camera: HassEntity; tick: number; onOpen: () => void }) {
  const hassUrl = useHassUrl();
  const [failed, setFailed] = useState(false);
  const offline = camera.state === "unavailable";
  const pic = camera.attributes.entity_picture as string | undefined;
  const src = pic && !offline ? `${pic.startsWith("http") ? pic : `${hassUrl}${pic}`}${pic.includes("?") ? "&" : "?"}_=${tick}` : null;

  useEffect(() => setFailed(false), [tick]);

  return (
    <button type="button" className="camera" onClick={onOpen} disabled={offline} aria-label={`${cameraName(camera)}: ver en directo`}>
      {src && !failed ? (
        <img className="camera__img" src={src} alt="" onError={() => setFailed(true)} />
      ) : (
        <span className="camera__empty">
          <CameraIcon size={28} />
          <span>{offline ? "Sin conexión" : "Sin imagen"}</span>
        </span>
      )}
      <span className="camera__label">
        <span className="camera__name">{cameraName(camera)}</span>
        {camera.state === "recording" && <span className="camera__rec">REC</span>}
      </span>
    </button>
  );
}

/** Live view: the MJPEG stream only exists while the dialog is mounted, so closing it stops the traffic. */
function CameraDialog({ camera, onClose }: { camera: HassEntity; onClose: () => void }) {
  const hassUrl = useHassUrl();
  const ref = useRef<HTMLDialogElement>(null);
  const [failed, setFailed] = useState(false);
  const token = camera.attributes.access_token as string | undefined;
  // Fixed when the dialog opens: HA rotates the token, but a running stream keeps going.
  const [streamSrc] = useState(() => `${hassUrl}/api/camera_proxy_stream/${camera.entity_id}${token ? `?token=${token}` : ""}`);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="camera-dialog"
      aria-label={`Cámara ${cameraName(camera)}`}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
    >
      <div className="camera-dialog__sheet">
        <header className="camera-dialog__head">
          <h3 className="camera-dialog__title">{cameraName(camera)}</h3>
          <button type="button" className="round-btn" aria-label="Cerrar" onClick={() => ref.current?.close()}>
            <CloseIcon />
          </button>
        </header>
        {failed ? (
          <p className="camera-dialog__error">No se pudo abrir la imagen en directo.</p>
        ) : (
          <img className="camera-dialog__img" src={streamSrc} alt={`Imagen en directo de ${cameraName(camera)}`} onError={() => setFailed(true)} />
        )}
      </div>
    </dialog>
  );
}
