import { defineConfig } from "vitest/config";
import dotenv from "dotenv";
dotenv.config({ quiet: true });
if (!process.env.TEST_DATABASE_URL)
  throw new Error(
    "Set TEST_DATABASE_URL to a dedicated PostgreSQL test database",
  );
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.NODE_ENV = "test";
process.env.DEMO_DATE = "2026-09-04T06:30:00.000Z";
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
