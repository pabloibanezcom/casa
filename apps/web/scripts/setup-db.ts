/**
 * Creates the `devices` collection with schema validation and indexes.
 * Optionally seeds pending devices (status planned/bought) from a census JSON:
 *
 *   pnpm --filter @casa/web db:setup ./path/to/censo-casa.json
 *
 * The census stays out of the repo; pass its path at runtime.
 */
import { readFile } from "node:fs/promises";
import { MongoClient } from "mongodb";
import { deviceJsonSchema, deviceSchema } from "../lib/devices";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "casa";
if (!uri) throw new Error("MONGODB_URI missing (did you create apps/web/.env.local?)");

const client = await new MongoClient(uri).connect();
const db = client.db(dbName);

const exists = (await db.listCollections({ name: "devices" }).toArray()).length > 0;
if (exists) {
  await db.command({ collMod: "devices", validator: { $jsonSchema: deviceJsonSchema } });
} else {
  await db.createCollection("devices", { validator: { $jsonSchema: deviceJsonSchema } });
}

const devices = db.collection("devices");
// Unique only once linked to HA; many pending devices share ha_device_id: null.
await devices.createIndex(
  { ha_device_id: 1 },
  { unique: true, partialFilterExpression: { ha_device_id: { $type: "string" } } },
);
await devices.createIndex({ name: 1 }, { unique: true });
console.log("✓ devices collection ready");

const seedPath = process.argv[2];
if (seedPath) {
  const census = JSON.parse(await readFile(seedPath, "utf8")) as { devices: Record<string, unknown>[] };
  const pending = census.devices.filter((d) => d.status === "planned" || d.status === "bought");
  let upserted = 0;
  for (const raw of pending) {
    const d = deviceSchema.parse(raw);
    const res = await devices.updateOne(
      { name: d.name },
      { $set: d, $setOnInsert: { created_at: new Date() } },
      { upsert: true },
    );
    upserted += res.upsertedCount + res.modifiedCount;
  }
  console.log(`✓ seeded ${pending.length} pending devices (${upserted} inserted/updated)`);
}

await client.close();
