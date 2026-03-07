import { auth } from "@workspace/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        안녕하세요, {session.user.name ?? session.user.email} 님
      </h1>
      <p className="text-sm text-muted-foreground">
        이 페이지는 로그인한 사용자만 볼 수 있습니다.
      </p>
    </main>
  );
}

