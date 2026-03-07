import { db, schema } from "@workspace/db";

export default async function UsersPage() {
  const users = await db.select().from(schema.users);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
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

