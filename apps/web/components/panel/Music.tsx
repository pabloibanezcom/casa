"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  findMusicAssistant,
  getLibrary,
  mediaControl,
  playOn,
  searchMusic,
  setVolume,
  type HassEntity,
  type MediaItem,
  type SearchResults,
} from "@casa/core";
import { useEntities, useHA } from "@casa/core/react";
import { MusicIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon, RadioIcon, SearchIcon, SpeakerIcon } from "./icons";

type Source = "radio" | "spotify";
const SPEAKERS_KEY = "casa.music.speakers";
const SOURCE_KEY = "casa.music.source";
const RADIO_SUGGESTIONS = ["Cadena SER", "Los 40", "COPE", "Radio Nacional", "Cadena 100", "Europa FM", "Kiss FM", "Rock FM"];

export function useMusicAssistant() {
  const { session } = useHA();
  return useMemo(() => (session ? findMusicAssistant(session.registries) : null), [session]);
}

const readLocal = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const writeLocal = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

export function Music() {
  const { session } = useHA();
  const entities = useEntities();
  const ma = useMusicAssistant();
  const [source, setSourceState] = useState<Source>(() => readLocal<Source>(SOURCE_KEY, "radio"));
  const [selected, setSelectedState] = useState<string[]>(() => readLocal<string[]>(SPEAKERS_KEY, []));
  const [error, setError] = useState<string | null>(null);

  const players = useMemo(
    () =>
      (ma?.players ?? [])
        .map((id) => entities[id])
        .filter((e): e is HassEntity => !!e)
        .sort((a, b) => Number(a.state === "unavailable") - Number(b.state === "unavailable") || name(a).localeCompare(name(b), "es")),
    [ma, entities],
  );

  // Default to the first available speaker; drop saved speakers that disappeared.
  const available = players.filter((p) => p.state !== "unavailable").map((p) => p.entity_id);
  const chosen = selected.filter((id) => available.includes(id));
  const speakers = chosen.length ? chosen : available.slice(0, 1);

  const setSource = (s: Source) => {
    setSourceState(s);
    writeLocal(SOURCE_KEY, s);
  };
  const toggleSpeaker = (id: string) => {
    const next = speakers.includes(id) ? speakers.filter((x) => x !== id) : [...speakers, id];
    setSelectedState(next);
    writeLocal(SPEAKERS_KEY, next);
  };

  const play = async (item: MediaItem) => {
    if (!session || !speakers.length) return;
    setError(null);
    try {
      await playOn(session.connection, entities, speakers, item);
    } catch (e) {
      setError(`No se pudo reproducir: ${(e as { message?: string }).message ?? "error"}`);
    }
  };

  if (!ma) return <p className="empty">Music Assistant no está disponible en Home Assistant.</p>;

  const nowPlaying =
    players.find((p) => speakers.includes(p.entity_id) && ["playing", "paused"].includes(p.state)) ??
    players.find((p) => p.state === "playing");

  return (
    <div className="music">
      <section className="card music__speakers" aria-label="Altavoces">
        <span className="eyebrow">Altavoces</span>
        <div className="speakers">
          {players.map((p) => {
            const on = speakers.includes(p.entity_id);
            const unavailable = p.state === "unavailable";
            return (
              <button
                key={p.entity_id}
                type="button"
                className="speaker"
                aria-pressed={on}
                disabled={unavailable}
                onClick={() => toggleSpeaker(p.entity_id)}
              >
                <SpeakerIcon />
                <span className="speaker__text">
                  <span className="speaker__name">{name(p)}</span>
                  <span className="speaker__state">{speakerState(p)}</span>
                </span>
              </button>
            );
          })}
        </div>
        {speakers.length > 1 && <p className="music__hint">Sonará en {speakers.length} altavoces a la vez, sincronizados.</p>}
      </section>

      {nowPlaying && session && <NowPlaying player={nowPlaying} hassUrl={session.auth.data.hassUrl} />}

      <Browser source={source} onSource={setSource} onPlay={play} />
      {error && <p className="warn" role="alert">{error}</p>}
    </div>
  );
}

function name(p: HassEntity) {
  return String(p.attributes.friendly_name ?? p.entity_id).replace(/^\[LG\]\s*/, "LG ");
}

function speakerState(p: HassEntity) {
  if (p.state === "unavailable") return "No disponible";
  if (p.state === "playing") return String(p.attributes.media_title ?? "Reproduciendo");
  if (p.state === "paused") return "En pausa";
  return "Libre";
}

function NowPlaying({ player, hassUrl }: { player: HassEntity; hassUrl: string }) {
  const { session } = useHA();
  const conn = session!.connection;
  const pic = player.attributes.entity_picture as string | undefined;
  const art = pic ? (pic.startsWith("http") ? pic : `${hassUrl}${pic}`) : null;
  const volume = typeof player.attributes.volume_level === "number" ? player.attributes.volume_level : null;
  const [localVolume, setLocalVolume] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => setLocalVolume(null), [volume]);

  const onVolume = (v: number) => {
    setLocalVolume(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void setVolume(conn, player.entity_id, v), 250);
  };

  return (
    <section className="card now-playing" aria-label="Reproduciendo ahora">
      <div className="now-playing__art">{art ? <img src={art} alt="" /> : <MusicIcon size={28} />}</div>
      <div className="now-playing__info">
        <span className="now-playing__title">{String(player.attributes.media_title ?? "—")}</span>
        <span className="now-playing__artist">
          {[player.attributes.media_artist, name(player)].filter(Boolean).join(" · ")}
        </span>
        {volume !== null && (
          <input
            className="volume"
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={localVolume ?? volume}
            onChange={(e) => onVolume(Number(e.target.value))}
            aria-label={`Volumen de ${name(player)}`}
          />
        )}
      </div>
      <div className="now-playing__controls">
        <button type="button" className="round-btn" aria-label="Anterior" onClick={() => void mediaControl(conn, player.entity_id, "media_previous_track")}>
          <PrevIcon />
        </button>
        <button type="button" className="round-btn round-btn--primary" aria-label={player.state === "playing" ? "Pausar" : "Reproducir"} onClick={() => void mediaControl(conn, player.entity_id, "media_play_pause")}>
          {player.state === "playing" ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button type="button" className="round-btn" aria-label="Siguiente" onClick={() => void mediaControl(conn, player.entity_id, "media_next_track")}>
          <NextIcon />
        </button>
      </div>
    </section>
  );
}

function Browser({ source, onSource, onPlay }: { source: Source; onSource: (s: Source) => void; onPlay: (i: MediaItem) => void }) {
  const { session } = useHA();
  const ma = useMusicAssistant();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<{ title: string; items: MediaItem[] }[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => setQuery(""), [source]);

  useEffect(() => {
    if (!session || !ma) return;
    let active = true;
    const conn = session.connection;
    const run = async () => {
      setLoading(true);
      try {
        const q = query.trim();
        if (source === "radio") {
          if (q) {
            const r = await searchMusic(conn, ma, q, "radio", 24);
            if (active) setItems([{ title: "Emisoras", items: r.radio }]);
          } else {
            const lib = await getLibrary(conn, ma, "radio", { limit: 24, orderBy: "last_played" });
            if (active) setItems(lib.length ? [{ title: "Tus emisoras", items: lib }] : []);
          }
        } else if (q) {
          const r: SearchResults = await searchMusic(conn, ma, q, undefined, 8);
          if (active)
            setItems(
              [
                { title: "Playlists", items: r.playlists },
                { title: "Artistas", items: r.artists },
                { title: "Álbumes", items: r.albums },
                { title: "Canciones", items: r.tracks },
              ].filter((s) => s.items.length),
            );
        } else {
          const lib = await getLibrary(conn, ma, "playlist", { limit: 30, orderBy: "name" });
          if (active) setItems([{ title: "Tus playlists", items: lib }]);
        }
      } catch {
        if (active) setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    const id = setTimeout(run, query ? 350 : 0);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [session, ma, source, query]);

  return (
    <section className="card music__browser" aria-label="Elegir música">
      <div className="music__toolbar">
        <div className="segmented" role="group" aria-label="Fuente">
          <button type="button" aria-pressed={source === "radio"} onClick={() => onSource("radio")}>
            <RadioIcon /> Radio
          </button>
          <button type="button" aria-pressed={source === "spotify"} onClick={() => onSource("spotify")}>
            <MusicIcon /> Spotify
          </button>
        </div>
        <label className="search">
          <SearchIcon />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={source === "radio" ? "Buscar emisora" : "Buscar canción, artista, álbum o playlist"}
            aria-label="Buscar"
          />
        </label>
      </div>

      {source === "radio" && !query && (
        <div className="suggestions">
          {RADIO_SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => setQuery(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      {loading && !items && <p className="muted">Cargando…</p>}
      {items && items.length === 0 && !loading && (
        <p className="muted">{query ? "Sin resultados." : source === "radio" ? "Busca una emisora o elige una de arriba." : "No hay playlists."}</p>
      )}
      <div className={`music__results ${loading ? "is-loading" : ""}`}>
        {items?.map((group) => (
          <div key={group.title} className="music__group">
            <h3 className="eyebrow">{group.title}</h3>
            <div className="media-grid">
              {group.items.map((item) => (
                <button key={item.uri} type="button" className="media-card" onClick={() => onPlay(item)} title={`Reproducir ${item.name}`}>
                  <span className={`media-card__art media-card__art--${item.media_type}`}>
                    {item.image ? <img src={item.image} alt="" loading="lazy" /> : item.media_type === "radio" ? <RadioIcon size={26} /> : <MusicIcon size={26} />}
                    <span className="media-card__play" aria-hidden="true"><PlayIcon size={18} /></span>
                  </span>
                  <span className="media-card__name">{item.name}</span>
                  {item.artists?.length ? <span className="media-card__sub">{item.artists.map((a) => a.name).join(", ")}</span> : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
