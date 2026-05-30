ALTER TABLE "documents" ALTER COLUMN "kind" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "original_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "size_bytes" integer;