import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@workspace/auth";
import { getMemberProfileByUserId } from "@workspace/db";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }
  const profile = await getMemberProfileByUserId(session.user.id);
  if (profile) {
    redirect("/");
  }
  return (
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden p-4 md:p-8">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950/98 to-slate-800" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.15),transparent)]" />
      <div className="relative w-full max-w-4xl">{children}</div>
    </div>
  );
}
