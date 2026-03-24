/** DB/client 경계 직렬화용 타입·상수 — postgres 번들 방지 */

export const BUNNY_INITIAL_SIZE = 12;
export const BUNNY_PAGE_SIZE = 9;

export type SerializedBunnyPhotoRow = {
  id: string;
  postId: string | null;
  bunnyProfileId: string;
  userId: string;
  imagePath: string;
  caption: string | null;
  createdAt: string | null;
};

export type SerializedBunnyPost = {
  postId: string;
  createdAt: string;
  caption: string | null;
  photos: SerializedBunnyPhotoRow[];
};
