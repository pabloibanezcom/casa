import type { Connection, HassEntity } from "home-assistant-js-websocket";
import type { Registries } from "./registries";

/**
 * Music Assistant through Home Assistant: its media players are the speakers,
 * and its services search Spotify / radio and play on one or more players.
 */
export interface MediaItem {
  media_type: string;
  uri: string;
  name: string;
  image?: string | null;
  favorite?: boolean;
  artists?: { name: string }[];
}

export interface SearchResults {
  artists: MediaItem[];
  albums: MediaItem[];
  tracks: MediaItem[];
  playlists: MediaItem[];
  radio: MediaItem[];
}

export interface MusicAssistant {
  configEntryId: string;
  players: string[];
}

export function findMusicAssistant(reg: Registries): MusicAssistant | null {
  const players = reg.entities.filter(
    (e) => e.platform === "music_assistant" && e.entity_id.startsWith("media_player.") && !e.disabled_by && !e.hidden_by,
  );
  const configEntryId = players.find((e) => e.config_entry_id)?.config_entry_id;
  return configEntryId && players.length ? { configEntryId, players: players.map((e) => e.entity_id) } : null;
}

async function maService<T>(conn: Connection, service: string, data: Record<string, unknown>): Promise<T> {
  const res = await conn.sendMessagePromise<{ response: T }>({
    type: "call_service",
    domain: "music_assistant",
    service,
    service_data: data,
    return_response: true,
  });
  return res.response;
}

const EMPTY: SearchResults = { artists: [], albums: [], tracks: [], playlists: [], radio: [] };

export async function searchMusic(
  conn: Connection,
  ma: MusicAssistant,
  name: string,
  mediaType?: "radio",
  limit = 12,
): Promise<SearchResults> {
  const res = await maService<Partial<SearchResults>>(conn, "search", {
    config_entry_id: ma.configEntryId,
    name,
    limit,
    ...(mediaType ? { media_type: mediaType } : {}),
  });
  return { ...EMPTY, ...res };
}

export async function getLibrary(
  conn: Connection,
  ma: MusicAssistant,
  mediaType: "playlist" | "radio" | "album" | "artist" | "track",
  opts: { limit?: number; favorite?: boolean; orderBy?: string } = {},
): Promise<MediaItem[]> {
  const res = await maService<{ items?: MediaItem[] }>(conn, "get_library", {
    config_entry_id: ma.configEntryId,
    media_type: mediaType,
    limit: opts.limit ?? 30,
    ...(opts.favorite !== undefined ? { favorite: opts.favorite } : {}),
    ...(opts.orderBy ? { order_by: opts.orderBy } : {}),
  });
  return res.items ?? [];
}

const service = (conn: Connection, domain: string, svc: string, entityId: string, data: Record<string, unknown> = {}) =>
  conn.sendMessagePromise({ type: "call_service", domain, service: svc, service_data: data, target: { entity_id: entityId } });

/**
 * Play on the chosen speakers. With several, the first leads and the rest are
 * joined to it so they play in sync; speakers grouped before but not chosen
 * now are released first.
 */
export async function playOn(conn: Connection, states: Record<string, HassEntity>, players: string[], item: MediaItem) {
  const [leader, ...rest] = players;
  if (!leader) return;
  const current = (states[leader]?.attributes.group_members as string[] | undefined) ?? [];
  for (const id of current) {
    if (id !== leader && !rest.includes(id)) await service(conn, "media_player", "unjoin", id).catch(() => {});
  }
  if (rest.length) await service(conn, "media_player", "join", leader, { group_members: rest });
  await service(conn, "music_assistant", "play_media", leader, {
    media_id: item.uri,
    media_type: item.media_type,
    enqueue: "replace",
  });
}

export const mediaControl = (conn: Connection, entityId: string, action: "media_play_pause" | "media_next_track" | "media_previous_track") =>
  service(conn, "media_player", action, entityId);

export const setVolume = (conn: Connection, entityId: string, level: number) =>
  service(conn, "media_player", "volume_set", entityId, { volume_level: Math.max(0, Math.min(1, level)) });
