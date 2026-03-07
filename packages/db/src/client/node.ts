import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../schema";

const connectionString = process.env.DATABASE_URL
  ? process.env.DATABASE_URL
  : `postgresql://${process.env.DATABASE_USER}:${encodeURIComponent(process.env.DATABASE_PASSWORD ?? "")}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/${process.env.DATABASE_NAME}`;

const client = postgres(connectionString, {
  max: 10,
});

export const db = drizzle(client, { schema });

