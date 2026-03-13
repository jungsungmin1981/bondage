import Link from "next/link";
import { auth } from "@workspace/auth";
import { getRiggerProfileById } from "@workspace/db";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { PhotoUploadForm } from "./photo-upload-form";

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
  const profile = await getRiggerProfileById(id);
  if (!profile) notFound();

  if (profile.userId !== session.user.id && !isAdmin(session)) {
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

      <div className="mx-auto max-w-2xl">
        <PhotoUploadForm riggerId={id} />
      </div>
    </div>
  );
}
