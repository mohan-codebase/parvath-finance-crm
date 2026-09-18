import net from "node:net";
import { randomUUID } from "node:crypto";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { db } from "./db.js";
import { config } from "./config.js";
import { now } from "./domain.js";
import { s3 } from "./documents.js";
import pino from "pino";
const log = pino({ level: config.NODE_ENV === "test" ? "silent" : "info" });
let stopping = false;
export async function runJob() {
  const leaseToken = randomUUID();
  const job = await db.native.collection<any>("Job").findOneAndUpdate(
    {
      $or: [
        { state: "pending", runAt: { $lte: now() } },
        {
          state: "processing",
          $expr: { $lt: ["$lockedAt", { $subtract: ["$$NOW", 5 * 60000] }] },
        },
      ],
    },
    [
      {
        $set: {
          state: "processing",
          lockedAt: "$$NOW",
          leaseToken,
          attempts: { $add: ["$attempts", 1] },
        },
      },
    ],
    { sort: { runAt: 1, id: 1 }, returnDocument: "after" },
  );
  if (!job) return false;
  try {
    if (job.type === "reminder")
      await db.transaction(async (tx) => {
        const current = await tx.job.findUniqueOrThrow({
          where: { id: job.id },
        });
        if (current.state !== "processing" || current.leaseToken !== leaseToken)
          return;
        const p = job.payload;
        const event = await tx.financialEvent.findFirst({
          where: {
            id: p.eventId,
            organizationId: job.organizationId,
            status: "Pending",
          },
        });
        if (event) {
          await tx.notification.upsert({
            where: { id: job.id },
            create: {
              id: job.id,
              organizationId: job.organizationId,
              userId: p.userId,
              title: `Reminder: ${event.type} due ${event.dueDate.toISOString().slice(0, 10)}`,
              link: `/renewals/${event.id}`,
            },
            update: {},
          });
        }
        await tx.job.update({
          where: { id: job.id },
          data: { state: event ? "completed" : "cancelled" },
        });
      });
    else if (job.type === "scan") {
      if (!config.CLAMAV_HOST) throw new Error("SCANNER_NOT_CONFIGURED");
      const doc = await db.document.findFirstOrThrow({
        where: {
          id: job.payload.documentId,
          organizationId: job.organizationId,
        },
      });
      const object = await s3.send(
        new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: doc.key }),
      );
      const buffer = Buffer.from(await object.Body!.transformToByteArray());
      const clean = await new Promise<boolean>((resolve, reject) => {
        const socket = net.createConnection({
          host: config.CLAMAV_HOST,
          port: config.CLAMAV_PORT,
        });
        let response = "";
        socket.setTimeout(30000, () => {
          socket.destroy();
          reject(new Error("SCAN_TIMEOUT"));
        });
        socket.on("error", reject);
        socket.on("data", (b) => {
          response += b.toString();
        });
        socket.on("end", () =>
          response.includes("OK")
            ? resolve(true)
            : response.includes("FOUND")
              ? resolve(false)
              : reject(new Error("SCAN_FAILED")),
        );
        socket.on("connect", () => {
          socket.write("zINSTREAM\0");
          for (let i = 0; i < buffer.length; i += 65536) {
            const chunk = buffer.subarray(i, i + 65536),
              len = Buffer.alloc(4);
            len.writeUInt32BE(chunk.length);
            socket.write(len);
            socket.write(chunk);
          }
          socket.write(Buffer.alloc(4));
        });
      });
      await db.transaction(async (tx) => {
        const claimed = await tx.job.updateMany({
          where: { id: job.id, state: "processing", leaseToken },
          data: { state: "completed" },
        });
        if (claimed.count)
          await tx.document.update({
            where: { id: doc.id },
            data: { status: clean ? "Available" : "Rejected" },
          });
      });
    } else throw new Error("UNKNOWN_JOB_TYPE");
  } catch (e) {
    await db.job.updateMany({
      where: { id: job.id, state: "processing", leaseToken },
      data: {
        state: job.attempts >= 5 ? "failed" : "pending",
        runAt: new Date(now().getTime() + Math.pow(2, job.attempts) * 60000),
        lastError:
          e instanceof Error && /^[A-Z_]+$/.test(e.message)
            ? e.message
            : "PROVIDER_FAILURE",
      },
    });
    log.warn({ jobId: job.id }, "Job failed; retry policy applied");
  }
  return true;
}
if (
  process.argv[1]?.endsWith("worker.ts") ||
  process.argv[1]?.endsWith("worker.js")
) {
  process.on("SIGTERM", () => {
    stopping = true;
  });
  process.on("SIGINT", () => {
    stopping = true;
  });
  while (!stopping) {
    const worked = await runJob();
    if (!worked) await new Promise((r) => setTimeout(r, 1000));
  }
  await db.close();
}
