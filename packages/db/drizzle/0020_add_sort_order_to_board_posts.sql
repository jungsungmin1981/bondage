-- bunny_board_posts, shared_board_posts에 목록 정렬용 sort_order 컬럼 추가
ALTER TABLE "bunny_board_posts" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL;
ALTER TABLE "shared_board_posts" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL;
