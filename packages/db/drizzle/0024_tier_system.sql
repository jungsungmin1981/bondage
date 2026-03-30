ALTER TABLE "member_profiles" ADD COLUMN "tier" text NOT NULL DEFAULT 'bronze';
ALTER TABLE "member_profiles" ADD COLUMN "stars" integer NOT NULL DEFAULT 0;

CREATE TABLE "tier_conditions" (
  "id" text PRIMARY KEY NOT NULL,
  "tier" text NOT NULL DEFAULT 'bronze',
  "condition_type" text NOT NULL,
  "threshold" integer NOT NULL DEFAULT 0,
  "star_index" integer NOT NULL,
  "label" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX "tier_conditions_tier_idx" ON "tier_conditions" ("tier");
CREATE INDEX "tier_conditions_star_index_idx" ON "tier_conditions" ("star_index");

-- 브론즈 기본 조건 (5개별)
INSERT INTO "tier_conditions" ("id", "tier", "condition_type", "threshold", "star_index", "label") VALUES
  ('bronze-1', 'bronze', 'first_post',        1,  1, '공개 게시물 최초 등록'),
  ('bronze-2', 'bronze', 'total_likes',       10, 2, '좋아요 10개 이상'),
  ('bronze-3', 'bronze', 'total_likes',       20, 3, '좋아요 20개 이상'),
  ('bronze-4', 'bronze', 'total_likes',       30, 4, '좋아요 30개 이상'),
  ('bronze-5', 'bronze', 'class_clear_rate',  50, 5, '초급 클래스 클리어율 50% 이상');
