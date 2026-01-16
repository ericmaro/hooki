ALTER TABLE "delivery_attempts" ALTER COLUMN "destination_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "delivery_attempts" ADD COLUMN "destination_url" text;