"use client";

import { BunnyCard } from "@/components/bunny-card";

type SubmissionItem = {
  id: string;
  month: string;
  userId: string;
  imageUrl: string;
  createdAt?: Date | string;
};

export function ShowoffSubmissionsGrid({
  totalCount,
  items,
}: {
  totalCount: number;
  items: SubmissionItem[];
}) {
  if (totalCount === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        이번 달 참가 사진이 없습니다.
      </p>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">이번 달 {totalCount}건 참가</h2>
      <ul className="grid list-none grid-cols-2 gap-4 sm:gap-6 lg:gap-8 sm:[grid-template-columns:repeat(auto-fill,minmax(min(100%,100px),280px))]">
        {items.map((item) => (
          <li key={item.id} className="min-w-0">
            <div className="w-full min-w-0 max-w-[280px]">
              <BunnyCard cardImageUrl={item.imageUrl} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
