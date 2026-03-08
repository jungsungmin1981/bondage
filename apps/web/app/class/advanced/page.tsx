import { auth } from "@workspace/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function ClassAdvancedPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) redirect("/login");

  return (
    <div className="min-h-[calc(100svh-3.5rem)] p-4 sm:p-6">
      <h1 className="text-xl font-semibold sm:text-2xl">클레스 · 고급</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        고급 클래스 콘텐츠가 이곳에 표시됩니다.
      </p>
    </div>
  );
}
