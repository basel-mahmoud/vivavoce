ALTER TABLE "users" ADD COLUMN "field_of_study" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "study_level" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "exam_formats" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subject_keys" jsonb DEFAULT '[]'::jsonb NOT NULL;