"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveRiggerProfileAction } from "./actions";
import { Button } from "@workspace/ui/components/button";
import type { PendingRiggerProfileRow } from "@workspace/db";

export function RiggerApprovalsList({
  items,
}: {
  items: PendingRiggerProfileRow[];
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const router = useRouter();

  function handleApprove(profileId: string) {
    setPendingId(profileId);
    approveRiggerProfileAction(profileId).then(() => {
      setPendingId(null);
      router.refresh();
    });
  }

  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="pb-2 pr-4 font-medium">닉네임</th>
            <th className="pb-2 pr-4 font-medium">이메일</th>
            <th className="pb-2 pr-4 font-medium">이름</th>
            <th className="pb-2 font-medium">승인</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} className="border-b">
              <td className="py-3 pr-4">{row.nickname}</td>
              <td className="py-3 pr-4">{row.email ?? "—"}</td>
              <td className="py-3 pr-4">{row.userName ?? "—"}</td>
              <td className="py-3">
                <Button
                  size="sm"
                  disabled={pendingId === row.id}
                  onClick={() => handleApprove(row.id)}
                >
                  {pendingId === row.id ? "처리 중..." : "승인"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
