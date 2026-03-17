import { auth } from "@workspace/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getSubmissionByUserAndMonth,
  getMonthlyHotpickSubmissionCount,
  getMonthlyHotpickSubmissionsLatest,
} from "@workspace/db";
import {
  getMonthKey,
  getPhase,
  getRegistrationEnd,
} from "@/lib/monthly-hotpick-period";
import { isAdmin } from "@/lib/admin";
import { MonthlyHotpickCountdown } from "@/components/monthly-hotpick-countdown";
import { RedirectWhenExpired } from "@/components/redirect-when-expired";
import { ShowoffRegistration } from "./showoff-registration";
import { ShowoffSubmissionsGrid } from "./showoff-submissions-grid";

const LATEST_COUNT = 5;

export default async function ShowoffRegisterPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) redirect("/login");

  const monthKey = getMonthKey();
  const phase = getPhase(monthKey);
  const admin = isAdmin(session);

  if (!admin && phase === "voting") redirect("/showoff/vote");

  const [mySubmission, totalCount, latestItems] = await Promise.all([
    getSubmissionByUserAndMonth(monthKey, session.user.id),
    getMonthlyHotpickSubmissionCount(monthKey),
    getMonthlyHotpickSubmissionsLatest(monthKey, LATEST_COUNT),
  ]);

  return (
    <>
      {phase === "registration" && (
        <RedirectWhenExpired
          endTimeIso={getRegistrationEnd(monthKey).toISOString()}
          redirectTo="/showoff/vote"
          disabled={admin}
        />
      )}
      <div
        className={
          phase === "ended"
            ? "mt-4 flex justify-center rounded-lg border bg-card p-4"
            : "mt-4 flex justify-center rounded-lg border-2 border-cyan-500/30 bg-slate-900 p-4 sm:p-5"
        }
      >
        <MonthlyHotpickCountdown
          phase={phase}
          monthKey={monthKey}
          className={phase === "ended" ? "text-sm" : undefined}
        />
      </div>

      {phase === "registration" && (
        <section className="mt-6 flex flex-col items-center">
          <h2 className="mb-3 text-lg font-semibold">사진 등록</h2>
          <div className="flex justify-center">
            <ShowoffRegistration
              monthKey={monthKey}
              mySubmission={
                mySubmission
                  ? { id: mySubmission.id, imageUrl: mySubmission.imageUrl }
                  : null
              }
            />
          </div>
        </section>
      )}

      {phase === "ended" && (
        <p className="mt-6 text-sm text-muted-foreground">
          이번 달 투표가 종료되었습니다. 결과는 메인에서 확인할 수 있습니다.
        </p>
      )}

      <section className="mt-8">
        <ShowoffSubmissionsGrid totalCount={totalCount} items={latestItems} />
      </section>
    </>
  );
}
