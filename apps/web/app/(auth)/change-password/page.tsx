import { auth } from "@workspace/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackURL?: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/login?callbackURL=" + encodeURIComponent("/change-password"));
  }
  const { callbackURL } = await searchParams;
  return <ChangePasswordForm callbackURL={callbackURL ?? "/rigger"} />;
}
