"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { authClient } from "@/lib/auth-client";

export function BunnyBoardWriteButton({ boardSlug }: { boardSlug: string }) {
  const { data: session } = authClient.useSession();

  if (boardSlug !== "free" || !session) return null;

  return (
    <Button asChild className="min-h-[44px] shrink-0">
      <Link href="/bunnies/board/free/new">
        <Pencil className="mr-2 size-4" />
        글쓰기
      </Link>
    </Button>
  );
}
