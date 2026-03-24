/** DB/client 경계 직렬화용 타입 — postgres 번들 방지 */
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
