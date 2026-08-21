CREATE TYPE "request_status" AS ENUM('success', 'error');--> statement-breakpoint
CREATE TYPE "routing_strategy" AS ENUM('cost', 'latency', 'balanced');--> statement-breakpoint
CREATE TABLE "management_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "request_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"application_id" uuid NOT NULL,
	"request_id" text NOT NULL,
	"model" text NOT NULL,
	"provider" text,
	"status" "request_status" NOT NULL,
	"http_status" integer NOT NULL,
	"error_code" text,
	"attempts" integer NOT NULL,
	"latency_ms" integer NOT NULL,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"total_tokens" integer,
	"estimated_cost_usd" numeric(12,6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "disabled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "allowed_models" text[];--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "routing_strategy" "routing_strategy";--> statement-breakpoint
CREATE UNIQUE INDEX "management_api_keys_key_hash_idx" ON "management_api_keys" ("key_hash");--> statement-breakpoint
CREATE INDEX "request_logs_application_id_created_at_idx" ON "request_logs" ("application_id","created_at");--> statement-breakpoint
CREATE INDEX "request_logs_created_at_idx" ON "request_logs" ("created_at");--> statement-breakpoint
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_application_id_applications_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id");