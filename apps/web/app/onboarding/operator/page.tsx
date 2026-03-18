import { OperatorOnboardingForm } from "./operator-onboarding-form";
import { submitOperatorProfile } from "../actions";
import { OnboardingFormActions } from "../onboarding-form-actions";

export default function OnboardingOperatorPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div>
        <div className="min-w-0 rounded-xl border border-blue-400/20 bg-white/95 shadow-lg dark:bg-slate-900/95">
          <div className="p-6">
            <h1 className="mb-1 text-lg font-semibold text-foreground">
              운영진 프로필
            </h1>
            <p className="mb-6 text-sm text-muted-foreground">
              닉네임과 자기소개를 입력한 뒤 관리자 승인 후 서비스를 이용할 수 있습니다.
            </p>
            <OperatorOnboardingForm
              formAction={submitOperatorProfile}
              formId="onboarding-operator-form"
            />
          </div>
        </div>
      </div>

      <OnboardingFormActions
        formId="onboarding-operator-form"
        submitLabel="저장하고 승인 대기"
      />
    </div>
  );
}
