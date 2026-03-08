import Link from "next/link";
import { auth } from "@workspace/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getRiggerById, getRiggerIdForUserId } from "@/lib/rigger-sample";

export default async function RiggerPhotosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) redirect("/login");

  const { id } = await params;
  const rigger = getRiggerById(id);
  if (!rigger) notFound();

  if (getRiggerIdForUserId(session.user.id) !== rigger.id) {
    redirect(`/rigger/${id}`);
  }

  return (
    <div className="min-h-[calc(100svh-3.5rem)] p-4 sm:p-6">
      <Link
        href={`/rigger/${id}`}
        className="mb-6 inline-block text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        ← 프로필로 돌아가기
      </Link>
      <div className="mx-auto max-w-2xl rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">사진 등록</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          사진 등록 기능은 준비 중입니다.
        </p>
      </div>
    </div>
  );
}
