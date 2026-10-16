import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_HA_URL: z.url(),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().default("casa"),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALENDAR_IDS: z.string().default("primary"),
  TOKEN_ENCRYPTION_KEY: z.string().min(1),
  SETUP_SECRET: z.string().min(16),
});

let cached: z.infer<typeof schema> | undefined;

/** Parsed lazily so `next build` doesn't need secrets. */
export function env() {
  cached ??= schema.parse(process.env);
  return cached;
}
