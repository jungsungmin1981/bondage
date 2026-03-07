import { NextResponse } from "next/server";
import { db, schema } from "@workspace/db";

export async function GET() {
  const users = await db.select().from(schema.users);
  return NextResponse.json(users);
}

