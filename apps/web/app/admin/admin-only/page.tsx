import { AdminOnlyRedirect } from "./admin-only-redirect";

/** 회원관리처럼 관리자 전용 탭 클릭 시 첫 하위(인증키)로 이동 (클라이언트 리다이렉트로 무한루프 방지) */
export default function AdminOnlyPage() {
  return <AdminOnlyRedirect />;
}
