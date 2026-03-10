/** DB/client 경계 직렬화용 타입만 — postgres 번들 방지 */
export type SerializedPhotoRow = {
  id: string;
  postId: string | null;
  riggerId: string;
  userId: string;
  imagePath: string;
  caption: string | null;
  createdAt: string | null;
};

export type SerializedPost = {
  postId: string;
  createdAt: string;
  caption: string | null;
  photos: SerializedPhotoRow[];
};
