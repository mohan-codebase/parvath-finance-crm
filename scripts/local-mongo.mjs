import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";
const port = 27027;
const directory = path.resolve(".local-mongodb");
mkdirSync(directory, { recursive: true, mode: 0o700 });
let client = new MongoClient(
  `mongodb://127.0.0.1:${port}/?directConnection=true`,
  { serverSelectionTimeoutMS: 1500 },
);
let running = false;
try {
  await client.db("admin").command({ ping: 1 });
  running = true;
} catch {
  /* Start only the dedicated local port below. */
}
if (!running) {
  await client.close();
  const child = spawn(
    "mongod",
    [
      "--replSet",
      "parvathLocal",
      "--port",
      String(port),
      "--bind_ip",
      "127.0.0.1",
      "--dbpath",
      directory,
      "--logpath",
      path.join(directory, "mongod.log"),
    ],
    { detached: true, stdio: "ignore" },
  );
  await new Promise((resolve, reject) => {
    child.once("spawn", resolve);
    child.once("error", reject);
  });
  child.unref();
  for (let i = 0; i < 20; i++) {
    try {
      client = new MongoClient(
        `mongodb://127.0.0.1:${port}/?directConnection=true`,
        { serverSelectionTimeoutMS: 1500 },
      );
      await client.db("admin").command({ ping: 1 });
      break;
    } catch {
      if (i === 19)
        throw new Error(
          "Local MongoDB did not start; inspect .local-mongodb/mongod.log",
        );
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}
try {
  let hello = await client.db("admin").command({ hello: 1 });
  if (!hello.setName && !hello.isreplicaset)
    throw new Error(
      "Port 27027 is used by a standalone server; refusing to modify it.",
    );
  if (hello.setName && hello.setName !== "parvathLocal")
    throw new Error(
      "Port 27027 belongs to a different replica set; refusing to modify it.",
    );
  if (!hello.setName)
    await client.db("admin").command({
      replSetInitiate: {
        _id: "parvathLocal",
        members: [{ _id: 0, host: `127.0.0.1:${port}` }],
      },
    });
  for (let attempt = 0; attempt < 40; attempt++) {
    hello = await client.db("admin").command({ hello: 1 });
    if (hello.isWritablePrimary) {
      console.log(
        "Local MongoDB replica set ready on 127.0.0.1:27027. No Atlas or existing database was changed.",
      );
      process.exitCode = 0;
      break;
    }
    if (attempt === 39) throw new Error("Replica set did not elect a primary");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
} finally {
  await client.close();
}
