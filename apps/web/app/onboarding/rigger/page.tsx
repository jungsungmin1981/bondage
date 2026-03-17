import { MemberProfileForm } from "@/components/member-profile-form";
import { submitRiggerProfile } from "../actions";
import { OnboardingFormActions } from "../onboarding-form-actions";

export default function OnboardingRiggerPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div>
        <div className="min-w-0 rounded-xl border border-blue-400/20 bg-white/95 shadow-lg dark:bg-slate-900/95">
          <div className="p-6">
            <h1 className="mb-1 text-lg font-semibold text-foreground">
              리거 상세 프로필
            </h1>
            <p className="mb-6 text-sm text-muted-foreground">
              상세 프로필을 입력한 뒤 관리자 승인 후 서비스를 이용할 수 있습니다.
            </p>
            <MemberProfileForm
              memberType="rigger"
              formAction={submitRiggerProfile}
              submitLabel="저장하고 승인 대기"
              formId="onboarding-rigger-form"
              hideSubmitButton
              confirmBeforeSubmitMessage="닉네임은 저장 후 변경할 수 없습니다. 한 번 더 확인 후 저장하시겠습니까?"
              nicknamePlaceholder="한글을 사랑합시다. 닉네임 변경불가"
            />
          </div>
        </div>
      </div>

      <OnboardingFormActions
        formId="onboarding-rigger-form"
        submitLabel="저장하고 승인 대기"
      />
    </div>
  );
}
