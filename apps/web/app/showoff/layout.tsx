import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { getAuthSession } from "@/lib/server-session";
import { ShowoffAdminNav } from "./showoff-admin-nav";

export default async function ShowoffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-[calc(100svh-3.5rem)] p-4 sm:p-6">
      <h1 className="text-xl font-semibold sm:text-2xl">월간 핫픽</h1>
      <ShowoffAdminNav isAdmin={isAdmin(session)} />
      {children}
    </div>
  );
}
