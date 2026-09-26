import { db } from "../db.js";
import { schema } from "./schema.js";

// Additive and repeatable: never drops a collection, record, or existing index.
export async function migrateDatabase() {
  const hello = await db.native.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== "isdbgrid")
    throw new Error(
      "MongoDB must be a replica set or Atlas cluster; standalone servers cannot run CRM transactions",
    );
  const existing = new Set(
    (await db.native.listCollections({}, { nameOnly: true }).toArray()).map(
      (c) => c.name,
    ),
  );
  for (const model of Object.values(schema)) {
    const properties: Record<string, any> = { _id: { bsonType: "string" } };
    for (const [field, spec] of Object.entries(model.fields)) {
      const type = (
        {
          String: "string",
          Int: ["int", "long", "double"],
          Boolean: "bool",
          DateTime: "date",
          BigInt: "long",
        } as Record<string, any>
      )[spec.type];
      properties[field] = type
        ? {
            bsonType: [
              ...(Array.isArray(type) ? type : [type]),
              ...(spec.nullable ? ["null"] : []),
            ],
          }
        : {};
    }
    const validator = {
      $jsonSchema: {
        bsonType: "object",
        required: ["_id", ...Object.keys(model.fields)],
        properties,
        additionalProperties: false,
      },
    };
    if (!existing.has(model.collection))
      await db.native.createCollection(model.collection, {
        validator,
        validationLevel: "strict",
        validationAction: "error",
      });
    else
      await db.native.command({
        collMod: model.collection,
        validator,
        validationLevel: "strict",
        validationAction: "error",
      });
    if (model.collection === "Client" && existing.has("Client"))
      await db.native
        .collection("Client")
        .updateMany(
          { onboardingJson: { $exists: false } },
          { $set: { onboardingJson: null } },
        );
    const collection = db.native.collection(model.collection);
    await collection.createIndex(
      { id: 1 },
      { unique: true, name: "id_unique" },
    );
    for (const index of model.indexes)
      await collection.createIndex(index.keys, {
        unique: index.unique,
        name:
          Object.keys(index.keys).join("_") +
          (index.unique ? "_unique" : "_idx"),
        ...(index.partial
          ? {
              partialFilterExpression: { [index.partial]: { $type: "string" } },
            }
          : {}),
      });
    // References are indexed for server-side joins, even where the original SQL
    // schema depended on a primary key on the opposite side of a relation.
    for (const r of Object.values(model.relations))
      if (
        r.owns &&
        !model.indexes.some((i) => Object.keys(i.keys)[0] === r.local)
      )
        await collection.createIndex({ [r.local]: 1 });
  }
  if (!existing.has("contactLocks"))
    await db.native.createCollection("contactLocks");
  await db.native
    .collection("sessions")
    .createIndex(
      { expires: 1 },
      { expireAfterSeconds: 0, name: "session_expiry" },
    );
  await db.native.collection("sessions").createIndex({ "session.userId": 1 });
  await db.native.collection("schemaVersions").updateOne(
    { _id: "001-mongodb" as any },
    {
      $setOnInsert: {
        appliedAt: new Date(),
        description:
          "CRM collections, strict validators, reference indexes, partial uniqueness and session TTL",
      },
    },
    { upsert: true },
  );
}
if (
  process.argv[1]?.endsWith("migrate.ts") ||
  process.argv[1]?.endsWith("migrate.js")
) {
  try {
    await migrateDatabase();
    console.log("MongoDB collection validation and indexes are ready.");
  } finally {
    await db.close();
  }
}
