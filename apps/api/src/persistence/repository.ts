import { randomUUID } from "node:crypto";
import {
  Decimal128,
  type ClientSession,
  type Db,
  type Document,
  type MongoClient,
} from "mongodb";
import { schema, type ModelName } from "./schema.js";
import type { Models } from "./models.js";

// This repository implements only the query operations used by the CRM. All
// filtering, joins, ordering, pagination and aggregation execute in MongoDB.
export interface Query {
  where?: Record<string, any>;
  include?: Record<string, any>;
  select?: Record<string, any>;
  orderBy?: Record<string, any> | Record<string, any>[];
  skip?: number;
  take?: number;
}
export class PersistenceError extends Error {
  constructor(
    public code: "RECORD_NOT_FOUND" | "INVALID_RECORD" | "INVALID_QUERY",
    message: string,
  ) {
    super(message);
  }
}
const fail = (message: string): never => {
  throw new PersistenceError("INVALID_QUERY", message);
};
const regexEscape = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const asList = <T>(value: T | T[]) => (Array.isArray(value) ? value : [value]);
function scalar(value: any): any {
  if (value === null || value instanceof Date || typeof value !== "object")
    return value;
  const out: Document = {};
  for (const [op, arg] of Object.entries(value)) {
    if (arg === undefined || op === "mode") continue;
    if (["contains", "startsWith", "endsWith"].includes(op)) {
      out.$regex =
        (op === "startsWith" ? "^" : "") +
        regexEscape(String(arg)) +
        (op === "endsWith" ? "$" : "");
      out.$options = value.mode === "insensitive" ? "i" : "";
    } else if (
      ["in", "notIn", "lt", "lte", "gt", "gte", "equals", "not"].includes(op)
    ) {
      const mongoOp =
        (
          { in: "$in", notIn: "$nin", equals: "$eq", not: "$ne" } as Record<
            string,
            string
          >
        )[op] || "$" + op;
      out[mongoOp] = arg;
    } else fail(`Unsupported filter operation: ${op}`);
  }
  return out;
}
function criteria(
  model: ModelName,
  where: Record<string, any> = {},
): { stages: Document[]; filter: Document } {
  const stages: Document[] = [],
    parts: Document[] = [];
  let counter = 0;
  const walk = (w: Record<string, any>): Document => {
    const pieces: Document[] = [];
    for (const [key, value] of Object.entries(w)) {
      if (value === undefined) continue;
      if (["AND", "OR", "NOT"].includes(key)) {
        const entries = asList(value).map(walk);
        if (entries.length)
          pieces.push({
            [key === "AND" ? "$and" : key === "OR" ? "$or" : "$nor"]: entries,
          });
      } else if (schema[model].compound[key]) {
        pieces.push(walk(value));
      } else if (schema[model].relations[key]) {
        const r = schema[model].relations[key],
          alias = `_filter${counter++}`;
        const nested = r.many
          ? (value.some ?? fail("Collection filters require some"))
          : value;
        stages.push({
          $lookup: {
            from: schema[r.model].collection,
            localField: r.local,
            foreignField: r.foreign,
            as: alias,
            pipeline: [
              ...matchStages(r.model, nested),
              { $limit: 1 },
              { $project: { _id: 1 } },
            ],
          },
        });
        pieces.push({ [alias + ".0"]: { $exists: true } });
      } else {
        if (!schema[model].fields[key])
          fail(`Unknown ${model} filter field: ${key}`);
        pieces.push({ [key]: scalar(value) });
      }
    }
    return pieces.length ? { $and: pieces } : {};
  };
  // Apply direct top-level restrictions before joins, especially tenant scope.
  for (const [key, value] of Object.entries(where))
    if (schema[model].fields[key] && value !== undefined)
      parts.push({ [key]: scalar(value) });
  const filter = walk(where);
  if (stages.length && parts.length)
    stages.unshift({ $match: { $and: parts } });
  return { stages, filter };
}
function matchStages(
  model: ModelName,
  where?: Record<string, any>,
): Document[] {
  const { stages, filter } = criteria(model, where);
  const aliases = stages.flatMap((s) => (s.$lookup ? [s.$lookup.as] : []));
  return [
    ...stages,
    { $match: filter },
    ...(aliases.length ? [{ $unset: aliases }] : []),
  ];
}
function joins(
  model: ModelName,
  include: Record<string, any> = {},
): Document[] {
  const stages: Document[] = [];
  for (const [name, options] of Object.entries(include)) {
    if (!options) continue;
    const r = schema[model].relations[name];
    if (!r) fail(`Unknown ${model} relation: ${name}`);
    stages.push({
      $lookup: {
        from: schema[r.model].collection,
        localField: r.local,
        foreignField: r.foreign,
        as: name,
        pipeline: pipeline(r.model, options === true ? {} : options),
      },
    });
    if (!r.many)
      stages.push({
        $set: {
          [name]: { $ifNull: [{ $arrayElemAt: ["$" + name, 0] }, null] },
        },
      });
  }
  return stages;
}
function pipeline(model: ModelName, query: Query = {}): Document[] {
  const stages = matchStages(model, query.where),
    sort: Document = {};
  for (const order of asList(query.orderBy || {})) {
    for (const [field, direction] of Object.entries(order)) {
      if (typeof direction === "object") {
        const relation = schema[model].relations[field];
        if (!relation || relation.many)
          fail("Sort requires a single-record relation");
        stages.push(...joins(model, { [field]: true }));
        for (const [key, dir] of Object.entries(direction)) {
          if (!schema[relation.model].fields[key]) fail("Unknown sort field");
          sort[field + "." + key] = dir === "desc" ? -1 : 1;
        }
      } else {
        if (!schema[model].fields[field]) fail("Unknown sort field");
        sort[field] = direction === "desc" ? -1 : 1;
      }
    }
  }
  if (Object.keys(sort).length)
    stages.push({ $sort: { ...sort, id: sort.id || 1 } });
  if (query.skip) stages.push({ $skip: query.skip });
  if (query.take !== undefined) {
    if (query.take < 1) return [{ $match: { $expr: false } }];
    stages.push({ $limit: query.take });
  }
  const selectedRelations = Object.fromEntries(
    Object.entries(query.select || {}).filter(
      ([k]) => schema[model].relations[k],
    ),
  );
  stages.push(...joins(model, { ...query.include, ...selectedRelations }));
  stages.push({
    $project: query.select
      ? {
          ...Object.fromEntries(
            Object.entries(query.select)
              .filter(([, v]) => v)
              .map(([k]) => [k, 1]),
          ),
          _id: 0,
        }
      : { _id: 0 },
  });
  return stages;
}
function validValue(model: ModelName, key: string, value: any) {
  const spec = schema[model].fields[key];
  if (!spec)
    throw new PersistenceError(
      "INVALID_RECORD",
      `Unknown ${model} field: ${key}`,
    );
  if (value === null && spec.nullable) return;
  const valid =
    spec.type === "String"
      ? typeof value === "string"
      : spec.type === "Int"
        ? Number.isSafeInteger(value)
        : spec.type === "Boolean"
          ? typeof value === "boolean"
          : spec.type === "DateTime"
            ? value instanceof Date && !isNaN(value.getTime())
            : spec.type === "BigInt"
              ? typeof value === "bigint" &&
                value >= -(2n ** 63n) &&
                value < 2n ** 63n
              : value !== undefined;
  if (!valid)
    throw new PersistenceError("INVALID_RECORD", `Invalid ${model}.${key}`);
}
function record(model: ModelName, data: Record<string, any>): Document {
  const out: Document = {};
  for (const [key, spec] of Object.entries(schema[model].fields)) {
    let value = data[key];
    if (value === undefined)
      value =
        spec.default === "uuid"
          ? randomUUID()
          : spec.default === "now"
            ? new Date()
            : spec.default !== undefined
              ? spec.type === "BigInt"
                ? BigInt(spec.default as number)
                : spec.default
              : spec.nullable
                ? null
                : undefined;
    validValue(model, key, value);
    out[key] = value;
  }
  out._id = out.id;
  return out;
}
export class Repository<N extends ModelName> {
  constructor(
    private model: N,
    private context: Database,
  ) {}
  private get collection() {
    return this.context.native.collection<any>(schema[this.model].collection);
  }
  private get options() {
    return { session: this.context.session };
  }
  async findMany(query: Query = {}): Promise<Models[N][]> {
    return this.collection
      .aggregate<Models[N]>(pipeline(this.model, query), {
        ...this.options,
        maxTimeMS: 30000,
      })
      .toArray();
  }
  async findFirst(query: Query = {}): Promise<Models[N] | null> {
    return (await this.findMany({ ...query, take: 1 }))[0] || null;
  }
  findUnique(query: Query) {
    return this.findFirst(query);
  }
  async findUniqueOrThrow(query: Query): Promise<Models[N]> {
    const found = await this.findFirst(query);
    if (!found)
      throw new PersistenceError("RECORD_NOT_FOUND", "Record not found");
    return found;
  }
  findFirstOrThrow(query: Query) {
    return this.findUniqueOrThrow(query);
  }
  async count(query: Query = {}): Promise<number> {
    const rows = await this.collection
      .aggregate(
        [...matchStages(this.model, query.where), { $count: "count" }],
        this.options,
      )
      .toArray();
    return Number(rows[0]?.count || 0);
  }
  private async references(data: Document) {
    for (const r of Object.values(schema[this.model].relations)) {
      if (!r.owns || data[r.local] == null) continue;
      const target = await this.context.native
        .collection(schema[r.model].collection)
        .findOne({ [r.foreign]: data[r.local] }, this.options);
      if (
        !target ||
        (data.organizationId &&
          target.organizationId &&
          data.organizationId !== target.organizationId)
      )
        throw new PersistenceError(
          "INVALID_RECORD",
          "Related record is missing or belongs to another workspace",
        );
    }
  }
  async create(
    query: { data: Record<string, any> } & Query,
  ): Promise<Models[N]> {
    const nested = Object.keys(query.data).some(
      (k) => schema[this.model].relations[k],
    );
    if (nested && !this.context.session)
      return this.context.transaction((tx) =>
        (tx[this.model] as Repository<N>).create(query),
      );
    const data = { ...query.data },
      children: [string, any][] = [];
    for (const [key, input] of Object.entries(data)) {
      const r = schema[this.model].relations[key];
      if (!r) {
        if (!schema[this.model].fields[key])
          throw new PersistenceError("INVALID_RECORD", "Unknown record field");
        continue;
      }
      delete data[key];
      if (!input) continue;
      if (!r.owns) {
        children.push([key, input]);
        continue;
      }
      const repo = this.context[r.model];
      const parent = input.connect
        ? await repo.findUniqueOrThrow({ where: input.connect })
        : input.connectOrCreate
          ? await repo.upsert({
              where: input.connectOrCreate.where,
              create: input.connectOrCreate.create,
              update: {},
            })
          : input.create
            ? await repo.create({ data: input.create })
            : fail("Unsupported related write");
      data[r.local] = (parent as any)[r.foreign];
    }
    const row = record(this.model, data);
    await this.references(row);
    await this.collection.insertOne(row, this.options);
    for (const [key, input] of children) {
      const r = schema[this.model].relations[key];
      if (!input.create) fail("Child writes require create");
      for (const child of asList(input.create))
        await this.context[r.model].create({
          data: { ...child, [r.foreign]: row[r.local] },
        });
    }
    return this.findUniqueOrThrow({ ...query, where: { id: row.id } });
  }
  private buildUpdate(data: Record<string, any>): Document {
    const set: Document = {},
      inc: Document = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      if (key === "id")
        throw new PersistenceError(
          "INVALID_RECORD",
          "Record identity is immutable",
        );
      if (value && typeof value === "object" && "increment" in value) {
        if (
          schema[this.model].fields[key]?.type !== "Int" ||
          !Number.isSafeInteger(value.increment)
        )
          fail("Invalid increment");
        inc[key] = value.increment;
      } else {
        validValue(this.model, key, value);
        set[key] = value;
      }
    }
    for (const [key, spec] of Object.entries(schema[this.model].fields))
      if (spec.updated) set[key] = new Date();
    return {
      ...(Object.keys(set).length ? { $set: set } : {}),
      ...(Object.keys(inc).length ? { $inc: inc } : {}),
    };
  }
  private async mutationFilter(where: Record<string, any> = {}) {
    const { stages, filter } = criteria(this.model, where);
    if (!stages.length) return filter;
    const ids = await this.findMany({ where, select: { id: true } });
    return { id: { $in: ids.map((r) => r.id) } };
  }
  async updateMany(query: {
    where?: Record<string, any>;
    data: Record<string, any>;
  }) {
    const update = this.buildUpdate(query.data);
    await this.references(query.data);
    const filter = await this.mutationFilter(query.where);
    if (!Object.keys(update).length)
      return {
        count: await this.collection.countDocuments(filter, this.options),
      };
    const result = await this.collection.updateMany(
      filter,
      update,
      this.options,
    );
    return { count: result.matchedCount };
  }
  async update(
    query: { data: Record<string, any> } & Query,
  ): Promise<Models[N]> {
    const update = this.buildUpdate(query.data);
    await this.references(query.data);
    if (!Object.keys(update).length) return this.findUniqueOrThrow(query);
    const row = await this.collection.findOneAndUpdate(
      await this.mutationFilter(query.where),
      update,
      { ...this.options, returnDocument: "after" },
    );
    if (!row)
      throw new PersistenceError("RECORD_NOT_FOUND", "Record not found");
    return this.findUniqueOrThrow({ ...query, where: { id: row.id } });
  }
  async upsert(
    query: {
      where: Record<string, any>;
      create: Record<string, any>;
      update: Record<string, any>;
    } & Query,
  ): Promise<Models[N]> {
    const row = record(this.model, query.create),
      update = this.buildUpdate(query.update);
    await this.references(row);
    for (const key of [
      ...Object.keys(update.$set || {}),
      ...Object.keys(update.$inc || {}),
    ])
      delete row[key];
    const result = await this.collection.findOneAndUpdate(
      await this.mutationFilter(query.where),
      { ...update, $setOnInsert: row },
      { ...this.options, upsert: true, returnDocument: "after" },
    );
    return this.findUniqueOrThrow({ ...query, where: { id: result!.id } });
  }
  async deleteMany(query: Query = {}) {
    const result = await this.collection.deleteMany(
      await this.mutationFilter(query.where),
      this.options,
    );
    return { count: result.deletedCount };
  }
  async delete(query: Query) {
    const row = await this.findUniqueOrThrow(query);
    await this.collection.deleteOne({ id: row.id }, this.options);
    return row;
  }
  async aggregate(query: Query & { _sum: Record<string, boolean> }) {
    const group: Document = { _id: null };
    for (const field of Object.keys(query._sum)) {
      if (schema[this.model].fields[field]?.type !== "BigInt")
        fail("Only exact monetary sums are supported");
      group[field] = { $sum: { $toDecimal: "$" + field } };
    }
    const rows = await this.collection
      .aggregate(
        [...matchStages(this.model, query.where), { $group: group }],
        this.options,
      )
      .toArray();
    return {
      _sum: Object.fromEntries(
        Object.keys(query._sum).map((k) => [
          k,
          rows[0]?.[k] instanceof Decimal128
            ? BigInt(rows[0][k].toString())
            : 0n,
        ]),
      ),
    };
  }
}
export type Database = DatabaseCore & { [N in ModelName]: Repository<N> };
class DatabaseCore {
  constructor(
    public connection: MongoClient,
    public native: Db,
    public session?: ClientSession,
  ) {}
  async transaction<T>(run: (tx: Database) => Promise<T>): Promise<T> {
    if (this.session) return run(this as unknown as Database);
    const session = this.connection.startSession();
    try {
      return await session.withTransaction(
        () => run(database(this.connection, this.native, session)),
        {
          readConcern: { level: "snapshot" },
          writeConcern: { w: "majority" },
          readPreference: "primary",
          maxCommitTimeMS: 15000,
          timeoutMS: 45000,
        },
      );
    } finally {
      await session.endSession();
    }
  }
  close() {
    return this.connection.close();
  }
}
export function database(
  client: MongoClient,
  native: Db,
  session?: ClientSession,
): Database {
  const context = new DatabaseCore(client, native, session) as Database;
  for (const name of Object.keys(schema) as ModelName[])
    (context as any)[name] = new Repository(name, context);
  return context;
}
