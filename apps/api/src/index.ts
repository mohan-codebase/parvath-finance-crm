import { app, logger, sessionPool } from "./app.js";
import { config } from "./config.js";
import { db } from "./db.js";
const server = app.listen(config.PORT, () =>
  logger.info({ port: config.PORT }, "Parvath API listening"),
);
const shutdown = () => {
  server.close(async () => {
    await db.$disconnect();
    await sessionPool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
