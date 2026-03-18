import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@workspace/auth";
import { isAdmin } from "@/lib/admin";

/**
 * 인증키 페이지는 관리자(주 관리자 또는 승인된 운영진) 접근 가능.
 * 리거/버니 인증키는 관리자 모두 생성 가능, 운영자 인증키는 주 관리자만 생성 가능.
 */
export default async function AdminInviteKeysLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (!isAdmin(session)) redirect("/admin/members/riggers");
  return <>{children}</>;
}
