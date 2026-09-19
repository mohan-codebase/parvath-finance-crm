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
// Auto-detect public URL on Railway if APP_ORIGIN is not explicitly provided
if (!process.env.APP_ORIGIN) {
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    process.env.APP_ORIGIN = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  } else if (process.env.RAILWAY_STATIC_URL) {
    process.env.APP_ORIGIN = `https://${process.env.RAILWAY_STATIC_URL}`;
  }
}
if (!process.env.TRUST_PROXY && process.env.RAILWAY_ENVIRONMENT) {
  process.env.TRUST_PROXY = "1";
}

let parsedConfig: z.infer<typeof schema>;
try {
  parsedConfig = schema.parse(process.env);
} catch (err) {
  if (err instanceof z.ZodError) {
    const missing = err.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    console.error(`\n❌ [CRM Config Error] Missing or invalid environment variables:\n${missing}\n\n👉 Please configure these in Railway under the "Variables" tab.\n`);
  }
  throw err;
}
export const config = parsedConfig;
if (
  config.NODE_ENV === "production" &&
  (config.DEMO_DATE || !config.APP_ORIGIN.startsWith("https://"))
)
  throw new Error("Production requires HTTPS and a real clock");
