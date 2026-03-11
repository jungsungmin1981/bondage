"use client";

import { Button } from "@workspace/ui/components/button";

type OnboardingFormActionsProps = {
  formId: string;
  submitLabel: string;
};

/** 프로필 카드 밖에 둘 제출 버튼. formId로 폼과 연결 (상단에 이전으로 있으므로 하단 이전으로 제거) */
export function OnboardingFormActions({
  formId,
  submitLabel,
}: OnboardingFormActionsProps) {
  return (
    <div className="mt-6 flex justify-center">
      <Button type="submit" form={formId}>
        {submitLabel}
      </Button>
    </div>
  );
}
