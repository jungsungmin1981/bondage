import Link from "next/link";
import { getApprovedBunnyProfiles } from "@workspace/db";

export default async function BunniesPage() {
  const bunnies = await getApprovedBunnyProfiles();

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            버니 회원 목록
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {bunnies.length}명 (승인된 버니 프로필)
          </p>
        </div>
        <Link
          href="/users"
          className="shrink-0 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          전체 Users 보기
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">닉네임</th>
                <th className="px-3 py-2 text-left font-medium">이메일</th>
                <th className="px-3 py-2 text-left font-medium">이름</th>
                <th className="px-3 py-2 text-left font-medium">생성일</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {bunnies.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2">{p.nickname}</td>
                  <td className="px-3 py-2 font-mono text-[12px] sm:text-sm">
                    {p.email ?? "-"}
                  </td>
                  <td className="px-3 py-2">{p.userName ?? "-"}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {p.createdAt
                      ? new Date(p.createdAt).toLocaleString("ko-KR", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </td>
                </tr>
              ))}
              {bunnies.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-8 text-center text-sm text-muted-foreground"
                  >
                    승인된 버니가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

