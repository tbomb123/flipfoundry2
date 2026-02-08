-- AddColumns: Saved Search Scheduling
-- Adds run_frequency_minutes and next_run_at for alert worker scheduling

-- Add run_frequency_minutes column (default 15 minutes, NOT NULL)
ALTER TABLE "saved_searches" 
ADD COLUMN "run_frequency_minutes" INTEGER NOT NULL DEFAULT 15;

-- Add next_run_at column (nullable timestamp for scheduling)
ALTER TABLE "saved_searches" 
ADD COLUMN "next_run_at" TIMESTAMP(3);

-- Create index on next_run_at for efficient worker queries
CREATE INDEX "saved_searches_next_run_at_idx" ON "saved_searches"("next_run_at");

-- Create composite index for worker: enabled alerts ordered by next run time
CREATE INDEX "saved_searches_alert_next_run_idx" ON "saved_searches"("alert_enabled", "next_run_at");
