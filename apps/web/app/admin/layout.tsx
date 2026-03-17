import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@workspace/auth";
import { isAdmin } from "@/lib/admin";
import { AdminTabs } from "./admin-tabs";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (!isAdmin(session)) redirect("/");

  return (
    <div className="-ml-3 sm:-ml-6">
      <aside
        className="fixed bottom-0 left-0 top-14 z-20 flex w-52 flex-col gap-4 border-r border-border bg-background py-6"
        style={{ paddingLeft: "max(1rem, env(safe-area-inset-left))", paddingRight: "1rem" }}
      >
        <h1 className="text-xl font-semibold sm:text-2xl">관리자</h1>
        <AdminTabs />
      </aside>
      <main className="min-h-0 min-w-0 py-6 sm:py-8" style={{ paddingLeft: "calc(13rem + env(safe-area-inset-left))" }}>
        <div className="px-4">{children}</div>
      </main>
    </div>
  );
}

