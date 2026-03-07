import type { Config } from "drizzle-kit";

const dbCredentials = process.env.DATABASE_URL
  ? { url: process.env.DATABASE_URL }
  : {
      host: process.env.DATABASE_HOST!,
      port: Number(process.env.DATABASE_PORT),
      user: process.env.DATABASE_USER!,
      password: process.env.DATABASE_PASSWORD!,
      database: process.env.DATABASE_NAME!,
    };

export default {
  schema: "./src/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials,
} satisfies Config;

