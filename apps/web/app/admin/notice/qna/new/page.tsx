import Link from "next/link";
import { AdminQnaPostForm } from "./qna-post-form";

export default function AdminNoticeQnaNewPage() {
  return (
    <div className="space-y-4">
      <Link
        href="/admin/notice/qna"
        className="inline-block min-h-[44px] text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        ← Q & A 목록
      </Link>
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        Q & A 글쓰기
      </h1>
      <AdminQnaPostForm />
    </div>
  );
}
