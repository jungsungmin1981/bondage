import Link from "next/link";
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
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold sm:text-2xl">관리자</h1>
        <Link
          href="/"
          className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline sm:text-sm"
        >
          홈으로
        </Link>
      </div>
      <AdminTabs />
      <div>{children}</div>
    </div>
  );
}

