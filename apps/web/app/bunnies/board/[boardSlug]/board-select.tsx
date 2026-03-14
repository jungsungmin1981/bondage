"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

type BoardSelectProps = {
  currentSlug: string;
  currentName: string;
  boards: { slug: string; name: string }[];
};

export function BoardSelect({
  currentSlug,
  currentName,
  boards,
}: BoardSelectProps) {
  const router = useRouter();

  return (
    <Select
      value={currentSlug}
      onValueChange={(slug) => {
        if (slug !== currentSlug) {
          router.push(`/bunnies/board/${encodeURIComponent(slug)}`);
        }
      }}
    >
      <SelectTrigger
        className="min-h-[44px] w-full max-w-[240px] font-medium"
        aria-label="게시판 선택"
        suppressHydrationWarning
      >
        <SelectValue>{currentName}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {boards.map((b) => (
          <SelectItem key={b.slug} value={b.slug}>
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
