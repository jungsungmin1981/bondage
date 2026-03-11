import { redirect } from "next/navigation";

export default function AdminIndexPage() {
  // 기본 관리자 진입 시 리거 승인으로 보내기
  redirect("/admin/riggers");
}

