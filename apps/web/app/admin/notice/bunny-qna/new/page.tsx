import Link from "next/link";
import { AdminBunnyQnaPostForm } from "./bunny-qna-post-form";

export default function AdminNoticeBunnyQnaNewPage() {
  return (
    <div className="space-y-4">
      <Link
        href="/admin/notice/bunny-qna"
        className="inline-block min-h-[44px] text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        ← 버니 전용 Q & A 목록
      </Link>
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        버니 전용 Q & A 글쓰기
      </h1>
      <AdminBunnyQnaPostForm />
    </div>
  );
}
