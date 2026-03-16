-- better-auth 비밀번호 재설정용 verification 테이블
-- db:migrate 가 실패한 경우 이 파일만 실행하세요. (Supabase SQL Editor 또는 psql)
CREATE TABLE IF NOT EXISTS "verification" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
