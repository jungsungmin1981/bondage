import Link from "next/link";
import { auth } from "@workspace/auth";
import { getApprovedBunnyProfiles, getSuspendedUserIds } from "@workspace/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { BunnyCard } from "@/components/bunny-card";
import { resolveBunnyCardUrl } from "@/lib/bunny-default-card-config";

const getCachedApprovedBunnies = unstable_cache(
  () => getApprovedBunnyProfiles(),
  ["approved-bunny-profiles"],
  { revalidate: 30 },
);

const getCachedSuspendedUserIds = unstable_cache(
  async () => {
    const set = await getSuspendedUserIds();
    return Array.from(set);
  },
  ["suspended-user-ids"],
  { revalidate: 30 },
);

export default async function BunniesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) redirect("/login");

  const [all, suspendedArr] = await Promise.all([
    getCachedApprovedBunnies(),
    getCachedSuspendedUserIds(),
  ]);
  const suspendedUserIds = new Set(suspendedArr);
  const hasAny = all.length > 0;
  const bunnies = hasAny
    ? [
        ...all.filter((p) => p.userId === session.user.id),
        ...all.filter((p) => p.userId !== session.user.id),
      ]
    : [];

  return (
    <div className="min-h-[calc(100svh-3.5rem)] p-4 sm:p-6">
      <div className="mb-8">
        <h1 className="text-xl font-semibold sm:text-2xl">버니</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          승인된 버니 프로필을 확인하세요.
        </p>
      </div>

      {!hasAny ? (
        <p className="text-sm text-muted-foreground">
          현재 등록된 버니가 없습니다. 승인된 버니가 있으면 여기에 표시됩니다.
        </p>
      ) : (
        <section
          aria-labelledby="bunny-list-heading"
          className="rounded-xl bg-rose-50/90 dark:bg-rose-950/40 px-4 py-5 sm:px-5 sm:py-6"
        >
          <h2
            id="bunny-list-heading"
            className="mb-4 text-lg font-semibold tracking-tight sm:text-xl"
          >
            버니 회원
          </h2>
          <ul className="grid list-none grid-cols-2 gap-4 sm:gap-6 lg:gap-8 sm:[grid-template-columns:repeat(auto-fill,minmax(min(100%,100px),280px))]">
            {bunnies.map((p) => {
              const name = (
                p.nickname?.trim() ||
                p.userName?.trim() ||
                "버니"
              ).slice(0, 50);

              return (
                <li key={p.id} className="min-w-0">
                  <Link
                    href={`/bunnies/${encodeURIComponent(p.id)}`}
                    className="block rounded-xl transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <div className="relative flex w-full flex-col items-center">
                      <div className="w-full min-w-0 max-w-[280px] rounded-xl shadow-[0_12px_28px_-8px_rgba(0,0,0,0.22)] transition-all duration-200 hover:-translate-y-2 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.28)]">
                        <BunnyCard
                        cardImageUrl={resolveBunnyCardUrl(p.cardImageUrl)}
                        jailOverlay={suspendedUserIds.has(p.userId)}
                      />
                      </div>
                      <p
                        className="mt-2 w-full min-w-0 truncate text-center text-sm font-medium text-foreground"
                        title={name}
                      >
                        {name}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
