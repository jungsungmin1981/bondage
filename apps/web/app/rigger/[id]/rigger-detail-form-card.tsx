"use client";

import { useState } from "react";
import { RiggerProfileInline } from "./rigger-profile-inline";
import type { RiggerProfileInlineProps } from "./rigger-profile-inline";

type RiggerDetailFormCardProps = Omit<
  RiggerProfileInlineProps,
  "onEditModeChange"
>;

export function RiggerDetailFormCard(props: RiggerDetailFormCardProps) {
  const [isFormEditing, setIsFormEditing] = useState(false);

  return (
    <div className="flex min-h-0 min-w-0 flex-col sm:col-start-2 sm:row-start-1">
      <div
        className={`rounded-xl border bg-card shadow-sm ${
          isFormEditing
            ? "min-h-0 flex flex-col"
            : "flex h-[380px] min-h-0 flex-col sm:h-[420px]"
        }`}
      >
        <div
          className={`p-6 ${
            isFormEditing ? "" : "min-h-0 flex-1 overflow-y-auto"
          }`}
        >
          <RiggerProfileInline
            {...props}
            onEditModeChange={setIsFormEditing}
          />
        </div>
      </div>
    </div>
  );
}
