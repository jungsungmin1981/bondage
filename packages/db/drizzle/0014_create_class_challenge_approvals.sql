CREATE TABLE IF NOT EXISTS "class_challenge_approvals" (
  "challenge_id" text NOT NULL,
  "staff_user_id" text NOT NULL,
  "decision" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("challenge_id", "staff_user_id")
);

ALTER TABLE "class_challenge_approvals" ADD CONSTRAINT "class_challenge_approvals_challenge_id_class_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."class_challenges"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE INDEX IF NOT EXISTS "class_challenge_approvals_challenge_id_idx" ON "class_challenge_approvals" ("challenge_id");
CREATE INDEX IF NOT EXISTS "class_challenge_approvals_staff_user_id_idx" ON "class_challenge_approvals" ("staff_user_id");
