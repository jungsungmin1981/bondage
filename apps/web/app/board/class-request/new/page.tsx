import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@workspace/auth";
import { headers } from "next/headers";
import { ClassRequestForm } from "./class-request-form";

export default async function ClassRequestNewPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <div className="mx-auto min-h-[calc(100svh-3.5rem)] w-full max-w-2xl p-4 sm:p-6">
      <Link
        href="/board/suggestion?tab=class-request"
        className="mb-4 inline-block min-h-[44px] text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        ← 클래스 요청 목록
      </Link>
      <h1 className="mb-6 text-xl font-semibold tracking-tight text-foreground">
        클래스 요청
      </h1>
      <ClassRequestForm />
    </div>
  );
}
