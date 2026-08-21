CREATE TABLE "application_usage_counters" (
	"application_id" uuid,
	"period_start" timestamp with time zone,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"requests_used" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "application_usage_counters_pkey" PRIMARY KEY("application_id","period_start")
);
--> statement-breakpoint
CREATE TABLE "rate_limit_counters" (
	"application_id" uuid,
	"window_start" timestamp with time zone,
	"request_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limit_counters_pkey" PRIMARY KEY("application_id","window_start")
);
--> statement-breakpoint
CREATE TABLE "usage_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"application_id" uuid NOT NULL,
	"model" text NOT NULL,
	"provider" text NOT NULL,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"total_tokens" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "monthly_token_quota" integer;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "rate_limit_per_minute" integer;--> statement-breakpoint
CREATE INDEX "usage_records_application_id_idx" ON "usage_records" ("application_id");--> statement-breakpoint
ALTER TABLE "application_usage_counters" ADD CONSTRAINT "application_usage_counters_application_id_applications_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id");--> statement-breakpoint
ALTER TABLE "rate_limit_counters" ADD CONSTRAINT "rate_limit_counters_application_id_applications_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id");--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_application_id_applications_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id");