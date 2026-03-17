import { auth } from "@workspace/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getMonthKey,
  getPhase,
  getVotingEnd,
} from "@/lib/monthly-hotpick-period";
import { isAdmin } from "@/lib/admin";
import { RedirectWhenExpired } from "@/components/redirect-when-expired";
import { ShowoffVoteContent } from "./showoff-vote-content";

export default async function ShowoffVotePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) redirect("/login");

  const monthKey = getMonthKey();
  const phase = getPhase(monthKey);
  const admin = isAdmin(session);

  if (!admin && phase !== "voting") redirect("/showoff");

  return (
    <>
      {phase === "voting" && (
        <RedirectWhenExpired
          endTimeIso={getVotingEnd(monthKey).toISOString()}
          redirectTo="/showoff"
          disabled={admin}
        />
      )}
      <ShowoffVoteContent phase={phase} monthKey={monthKey} isAdmin={admin} />
    </>
  );
}
