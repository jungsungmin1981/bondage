import { redirect } from "next/navigation";

export default function AdminIndexPage() {
  // 기본 관리자 진입 시 회원관리(리거승인)로 보내기
  redirect("/admin/members/riggers");
}

