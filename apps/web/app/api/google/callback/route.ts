import { cookies } from "next/headers";
import { exchangeCode } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const jar = await cookies();
  const expected = jar.get("google_oauth_state")?.value;
  jar.delete("google_oauth_state");

  const code = url.searchParams.get("code");
  if (!code || !expected || url.searchParams.get("state") !== expected) {
    return new Response("Invalid OAuth state", { status: 400 });
  }

  await exchangeCode(code, `${url.origin}/api/google/callback`);
  return new Response("Google Calendar conectado. Ya puedes cerrar esta pestaña.");
}
