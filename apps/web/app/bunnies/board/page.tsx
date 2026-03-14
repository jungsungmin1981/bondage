import Link from "next/link";
import { getBunnyBoards } from "@workspace/db";
import { MessageSquare, Megaphone, PenLine, HelpCircle } from "lucide-react";

const SLUG_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  notice: Megaphone,
  free: MessageSquare,
  review: PenLine,
  qna: HelpCircle,
};

export default async function BunnyBoardLandingPage() {
  const boards = await getBunnyBoards();

  return (
    <div className="mx-auto min-h-[calc(100svh-3.5rem)] w-full max-w-2xl p-4 sm:p-6">
      <Link
        href="/bunnies"
        className="mb-6 inline-block min-h-[44px] text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        ← 버니
      </Link>

      <h1 className="mb-1 text-xl font-semibold tracking-tight text-foreground">
        버니 게시판
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        게시판을 선택해 주세요.
      </p>

      <ul className="flex flex-col gap-2">
        {boards.map((board) => {
          const Icon = SLUG_ICON[board.slug] ?? MessageSquare;
          return (
            <li key={board.id}>
              <Link
                href={`/bunnies/board/${encodeURIComponent(board.slug)}`}
                className="flex min-h-[48px] w-full items-center gap-4 rounded-xl border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted/70"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                  <Icon className="size-5 text-muted-foreground" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block font-medium text-foreground">
                    {board.name}
                  </span>
                  {board.description && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {board.description}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
