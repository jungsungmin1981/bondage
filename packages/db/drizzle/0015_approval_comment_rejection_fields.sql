-- 승인 시 코멘트, 반려 시 설명·이미지 저장
ALTER TABLE "class_challenge_approvals" ADD COLUMN IF NOT EXISTS "comment" text;
ALTER TABLE "class_challenge_approvals" ADD COLUMN IF NOT EXISTS "rejection_note" text;
ALTER TABLE "class_challenge_approvals" ADD COLUMN IF NOT EXISTS "rejection_image_urls" jsonb;
