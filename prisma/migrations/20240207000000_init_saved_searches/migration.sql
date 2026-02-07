-- CreateTable: saved_searches
-- Core retention infrastructure for the arbitrage scanning system

CREATE TABLE "saved_searches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "query" TEXT NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "alert_enabled" BOOLEAN NOT NULL DEFAULT false,
    "minimum_score" INTEGER NOT NULL DEFAULT 70,
    "last_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable: alert_history
-- Track sent alerts for deduplication and analytics

CREATE TABLE "alert_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "saved_search_id" UUID NOT NULL,
    "item_id" TEXT NOT NULL,
    "deal_score" INTEGER NOT NULL,
    "alert_type" TEXT NOT NULL DEFAULT 'email',
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Performance indexes for saved_searches
CREATE INDEX "saved_searches_user_id_idx" ON "saved_searches"("user_id");
CREATE INDEX "saved_searches_alert_enabled_idx" ON "saved_searches"("alert_enabled");
CREATE INDEX "saved_searches_user_id_alert_enabled_idx" ON "saved_searches"("user_id", "alert_enabled");

-- CreateIndex: Performance indexes for alert_history
CREATE INDEX "alert_history_saved_search_id_idx" ON "alert_history"("saved_search_id");
CREATE INDEX "alert_history_item_id_idx" ON "alert_history"("item_id");
CREATE INDEX "alert_history_saved_search_id_item_id_idx" ON "alert_history"("saved_search_id", "item_id");
