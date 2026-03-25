import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { auth } from "@workspace/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/");

  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
