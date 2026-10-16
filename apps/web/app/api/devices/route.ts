import { authorize } from "@/lib/auth";
import { db } from "@/lib/mongo";
import { deviceSchema, type Device } from "@/lib/devices";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await authorize(req);
  if (denied) return denied;

  const devices = await (await db())
    .collection<Device>("devices")
    .find({ ha_device_id: null })
    .sort({ floor: 1, room: 1, name: 1 })
    .toArray();
  return Response.json(devices);
}

export async function POST(req: Request) {
  const denied = await authorize(req);
  if (denied) return denied;

  const parsed = deviceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 });

  const doc: Device = { ...parsed.data, created_at: new Date() };
  const { insertedId } = await (await db()).collection<Device>("devices").insertOne(doc);
  return Response.json({ ...doc, _id: insertedId }, { status: 201 });
}
