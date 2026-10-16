import { db } from "./mongo";
import { decrypt, encrypt } from "./crypto";
import { env } from "./env";

const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const SECRET_ID = "google";

export function authUrl(redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id: env().GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent", // always return a refresh token
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env().GOOGLE_CLIENT_ID,
      client_secret: env().GOOGLE_CLIENT_SECRET,
      ...body,
    }),
  });
  if (!res.ok) throw new Error(`Google token endpoint → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; expires_in: number; refresh_token?: string }>;
}

export async function exchangeCode(code: string, redirectUri: string) {
  const tokens = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
  if (!tokens.refresh_token) throw new Error("Google did not return a refresh token");
  const secrets = (await db()).collection<{ _id: string; value: string; updated_at: Date }>("secrets");
  await secrets.updateOne(
    { _id: SECRET_ID },
    { $set: { value: encrypt(tokens.refresh_token), updated_at: new Date() } },
    { upsert: true },
  );
}

// Access tokens last ~1h; keep one in memory per warm instance.
let accessToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken() {
  if (accessToken && accessToken.expiresAt > Date.now() + 60_000) return accessToken.value;
  const secrets = (await db()).collection<{ _id: string; value: string }>("secrets");
  const doc = await secrets.findOne({ _id: SECRET_ID });
  if (!doc) throw new Error("Google Calendar not connected: visit /api/google/connect?secret=…");
  const tokens = await tokenRequest({ grant_type: "refresh_token", refresh_token: decrypt(doc.value) });
  accessToken = { value: tokens.access_token, expiresAt: Date.now() + tokens.expires_in * 1000 };
  return accessToken.value;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
}

interface GoogleEvent {
  id: string;
  summary?: string;
  location?: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
}

export async function listEvents(days: number): Promise<CalendarEvent[]> {
  const token = await getAccessToken();
  const timeMin = new Date();
  const timeMax = new Date(timeMin.getTime() + days * 86_400_000);
  const calendarIds = env().GOOGLE_CALENDAR_IDS.split(",").map((s) => s.trim()).filter(Boolean);

  const perCalendar = await Promise.all(
    calendarIds.map(async (calendarId) => {
      const params = new URLSearchParams({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "100",
      });
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
        { headers: { authorization: `Bearer ${token}` }, cache: "no-store" },
      );
      if (!res.ok) throw new Error(`Calendar ${calendarId} → ${res.status}`);
      const { items } = (await res.json()) as { items: GoogleEvent[] };
      return items.map<CalendarEvent>((e) => ({
        id: e.id,
        calendarId,
        title: e.summary ?? "(sin título)",
        start: e.start.dateTime ?? e.start.date ?? "",
        end: e.end.dateTime ?? e.end.date ?? "",
        allDay: !e.start.dateTime,
        location: e.location ?? null,
      }));
    }),
  );

  return perCalendar.flat().sort((a, b) => a.start.localeCompare(b.start));
}
