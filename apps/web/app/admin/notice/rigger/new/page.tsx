import Link from "next/link";
import { AdminNoticeRiggerPostForm } from "./notice-post-form";

export default function AdminNoticeRiggerNewPage() {
  return (
    <div className="space-y-4">
      <Link
        href="/admin/notice/rigger"
        className="inline-block min-h-[44px] text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        ← 공지 목록
      </Link>
      <h2 className="text-lg font-semibold text-foreground">공지 작성</h2>
      <AdminNoticeRiggerPostForm />
    </div>
  );
}
