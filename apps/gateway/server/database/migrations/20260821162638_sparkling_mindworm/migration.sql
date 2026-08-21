CREATE TABLE "provider_circuit_state" (
	"provider" text PRIMARY KEY,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"opened_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_latency_state" (
	"model_id" text PRIMARY KEY,
	"average_latency_ms" double precision NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
