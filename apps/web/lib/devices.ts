import { z } from "zod";

/**
 * Only what HA doesn't know: devices planned or bought but not yet installed.
 * Once a device exists in HA, its ha_device_id is set and its live state is
 * read from HA instead.
 */
export const deviceSchema = z.object({
  name: z.string().min(1),
  floor: z.string().nullable(),
  room: z.string().nullable(),
  integration: z.string().nullable(),
  model: z.string().nullable(),
  status: z.enum(["planned", "bought"]),
  ha_device_id: z.string().nullable().default(null),
  ip: z.string().nullable().default(null),
  mac: z.string().nullable().default(null),
  ip_reserved: z.boolean().nullable().default(null),
  notes: z.string().nullable().default(null),
});

export type Device = z.infer<typeof deviceSchema> & { created_at: Date };

/** MongoDB-side validator, kept in sync with deviceSchema. */
export const deviceJsonSchema = {
  bsonType: "object",
  required: ["name", "status", "created_at"],
  properties: {
    name: { bsonType: "string", minLength: 1 },
    floor: { bsonType: ["string", "null"] },
    room: { bsonType: ["string", "null"] },
    integration: { bsonType: ["string", "null"] },
    model: { bsonType: ["string", "null"] },
    status: { enum: ["planned", "bought"] },
    ha_device_id: { bsonType: ["string", "null"] },
    ip: { bsonType: ["string", "null"] },
    mac: { bsonType: ["string", "null"] },
    ip_reserved: { bsonType: ["bool", "null"] },
    notes: { bsonType: ["string", "null"] },
    created_at: { bsonType: "date" },
  },
} as const;
