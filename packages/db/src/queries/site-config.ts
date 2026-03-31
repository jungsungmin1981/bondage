import { eq } from "drizzle-orm";
import { db } from "../client/node";
import * as schema from "../schema";

export async function getSiteConfigValue(key: string): Promise<string | null> {
  const [row] = await db
    .select({ value: schema.siteConfig.value })
    .from(schema.siteConfig)
    .where(eq(schema.siteConfig.key, key))
    .limit(1);
  return row?.value ?? null;
}

export async function setSiteConfigValue(
  key: string,
  value: string,
): Promise<void> {
  await db
    .insert(schema.siteConfig)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: schema.siteConfig.key,
      set: { value, updatedAt: new Date() },
    });
}
