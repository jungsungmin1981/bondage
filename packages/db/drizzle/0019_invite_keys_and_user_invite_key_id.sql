-- invite_keys 테이블 (리거 발급 회원가입 인증키)
CREATE TABLE IF NOT EXISTS "invite_keys" (
  "id" text PRIMARY KEY NOT NULL,
  "key" text NOT NULL UNIQUE,
  "rigger_id" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- users 테이블에 가입 시 사용한 인증키 id 컬럼 추가
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invite_key_id" text;
