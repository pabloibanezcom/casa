import { MongoClient, type Db } from "mongodb";
import { env } from "./env";

// Reuse the client across hot reloads (dev) and warm invocations (Vercel).
const g = globalThis as { _mongo?: Promise<MongoClient> };

export async function db(): Promise<Db> {
  g._mongo ??= new MongoClient(env().MONGODB_URI, { maxPoolSize: 5 }).connect();
  return (await g._mongo).db(env().MONGODB_DB);
}
