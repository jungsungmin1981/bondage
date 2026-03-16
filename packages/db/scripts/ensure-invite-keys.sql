-- invite_keys 테이블 및 users.invite_key_id 컬럼
-- db:migrate가 statement timeout 등으로 실패한 경우 이 파일만 실행하세요. (Supabase SQL Editor 또는 psql)
CREATE TABLE IF NOT EXISTS "invite_keys" (
  "id" text PRIMARY KEY NOT NULL,
  "key" text NOT NULL UNIQUE,
  "rigger_id" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invite_key_id" text;
