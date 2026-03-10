import { db, schema } from "@workspace/db";
import Link from "next/link";

export default async function UsersPage() {
  const users = await db.select().from(schema.users);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4">
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <Link
          href="/bunnies"
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          버니 회원만 보기
        </Link>
      </div>
      <ul className="space-y-1 text-sm">
        {users.map((user) => (
          <li key={user.id}>
            {user.email}
            {user.name ? ` (${user.name})` : null}
          </li>
        ))}
      </ul>
    </main>
  );
}

