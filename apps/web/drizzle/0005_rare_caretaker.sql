CREATE TABLE "question_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"prompt_hash" text NOT NULL,
	"prompt" text NOT NULL,
	"last_score" integer,
	"times_seen" integer DEFAULT 1 NOT NULL,
	"stage" integer DEFAULT 0 NOT NULL,
	"due_at" date NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "question_reviews" ADD CONSTRAINT "question_reviews_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_reviews" ADD CONSTRAINT "question_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "question_reviews_user_prompt_uq" ON "question_reviews" USING btree ("user_id","prompt_hash");--> statement-breakpoint
CREATE INDEX "question_reviews_due_idx" ON "question_reviews" USING btree ("user_id","due_at");