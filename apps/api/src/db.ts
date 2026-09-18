import { MongoClient } from "mongodb";
import { config } from "./config.js";
import { database } from "./persistence/repository.js";
export const mongoClient = new MongoClient(config.MONGODB_URI, {
  appName: "ParvathFinServCRM",
  maxPoolSize: 20,
  serverSelectionTimeoutMS: 10000,
  useBigInt64: true,
  ignoreUndefined: true,
});
export const db = database(mongoClient, mongoClient.db(config.MONGODB_DB));
