import { getApprovedBunnyProfiles } from "@workspace/db";

/**
 * GET /api/bunnies - 승인된 버니 프로필 목록 (member_profiles 기반).
 * 사진 업로드 폼 등에서 버니 선택용.
 */
export async function GET() {
  const profiles = await getApprovedBunnyProfiles();
  const list = profiles.map((p) => ({
    id: p.userId,
    email: p.email ?? "",
    name: p.nickname ?? p.userName ?? null,
  }));
  return Response.json(list);
}
