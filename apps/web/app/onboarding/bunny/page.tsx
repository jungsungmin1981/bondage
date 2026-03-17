import { MemberProfileForm } from "@/components/member-profile-form";
import { submitBunnyProfile } from "../actions";
import { OnboardingFormActions } from "../onboarding-form-actions";

export default function OnboardingBunnyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div>
        <div className="min-w-0 rounded-xl border border-blue-400/20 bg-white/95 shadow-lg dark:bg-slate-900/95">
          <div className="p-6">
            <h1 className="mb-1 text-lg font-semibold text-foreground">
              버니 상세 프로필
            </h1>
            <p className="mb-6 text-sm text-muted-foreground">
              상세 프로필을 입력하면 바로 이용할 수 있습니다.
            </p>
            <MemberProfileForm
              memberType="bunny"
              formAction={submitBunnyProfile}
              submitLabel="저장하고 시작하기"
              formId="onboarding-bunny-form"
              hideSubmitButton
            />
          </div>
        </div>
      </div>

      <OnboardingFormActions
        formId="onboarding-bunny-form"
        submitLabel="저장하고 시작하기"
      />
    </div>
  );
}
