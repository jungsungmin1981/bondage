import { Suspense } from "react";
import { SignupForm } from "@/components/signup-form";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="rounded-2xl border border-blue-400/30 bg-blue-500/25 px-8 py-10 text-center text-blue-200">로딩 중...</div>}>
      <SignupForm />
    </Suspense>
  );
}
