import { randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { authUrl } from "@/lib/google";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * One-off: open /api/google/connect?secret=<SETUP_SECRET> in a browser to
 * grant calendar access. The refresh token is stored encrypted in Mongo.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const given = Buffer.from(url.searchParams.get("secret") ?? "");
  const expected = Buffer.from(env().SETUP_SECRET);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return new Response("Forbidden", { status: 403 });
  }

  const state = randomBytes(16).toString("hex");
  (await cookies()).set("google_oauth_state", state, {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    maxAge: 600,
    path: "/api/google",
  });

  return Response.redirect(authUrl(`${url.origin}/api/google/callback`, state));
}
