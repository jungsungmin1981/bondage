"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { authClient } from "@/lib/auth-client";

export function ClassRequestListClient() {
  const { data: session } = authClient.useSession();
  if (!session) return null;

  return (
    <Button asChild className="min-h-[44px] shrink-0">
      <Link href="/board/class-request/new">
        <Pencil className="mr-2 size-4" />
        요청하기
      </Link>
    </Button>
  );
}
