"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { authClient } from "@/lib/auth-client";

export function BoardWriteButton({ boardSlug }: { boardSlug: string }) {
  const { data: session } = authClient.useSession();
  const canWrite =
    !!session && (boardSlug === "free" || boardSlug === "suggestion");

  if (!canWrite) return null;

  return (
    <Button asChild className="min-h-[44px] shrink-0">
      <Link href={`/board/${encodeURIComponent(boardSlug)}/new`}>
        <Pencil className="mr-2 size-4" />
        글쓰기
      </Link>
    </Button>
  );
}
