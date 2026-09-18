import dotenv from "dotenv";
import path from "node:path";
dotenv.config({
  path: [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../../.env"),
  ],
  quiet: true,
});
import { z } from "zod";
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4007),
  APP_ORIGIN: z.url(),
  MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//),
  MONGODB_DB: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/)
    .min(1),
  SESSION_SECRET: z.string().min(32),
  DEMO_DATE: z.string().optional(),
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("ap-south-1"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  CLAMAV_HOST: z.string().optional(),
  CLAMAV_PORT: z.coerce.number().default(3310),
  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().default("no-reply@example.com"),
});
export const config = schema.parse(process.env);
if (
  config.NODE_ENV === "production" &&
  (config.DEMO_DATE || !config.APP_ORIGIN.startsWith("https://"))
)
  throw new Error("Production requires HTTPS and a real clock");
