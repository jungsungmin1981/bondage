-- 운영자 전용 인증키는 관리자만 발급하므로 rigger_id를 nullable로 변경
ALTER TABLE "invite_keys" ALTER COLUMN "rigger_id" DROP NOT NULL;
