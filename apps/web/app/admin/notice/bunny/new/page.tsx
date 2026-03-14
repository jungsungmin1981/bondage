import Link from "next/link";
import { AdminNoticePostForm } from "./notice-post-form";

export default function AdminNoticeBunnyNewPage() {
  return (
    <div className="space-y-4">
      <Link
        href="/admin/notice/bunny"
        className="inline-block min-h-[44px] text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        ← 버니 공지 목록
      </Link>
      <h2 className="text-lg font-semibold text-foreground">버니 공지 작성</h2>
      <AdminNoticePostForm />
    </div>
  );
}
