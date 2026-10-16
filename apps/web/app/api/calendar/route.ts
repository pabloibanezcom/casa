import { authorize } from "@/lib/auth";
import { listEvents } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await authorize(req);
  if (denied) return denied;

  const days = Math.min(Math.max(Number(new URL(req.url).searchParams.get("days")) || 7, 1), 31);
  try {
    return Response.json(await listEvents(days));
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
