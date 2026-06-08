-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PAST_DUE');

-- AlterEnum
ALTER TYPE "EntryStatus" ADD VALUE 'PROMOTED';

-- AlterTable
ALTER TABLE "clubs" ADD COLUMN     "course_rating" DECIMAL(4,1),
ADD COLUMN     "par" INTEGER,
ADD COLUMN     "slope_rating" INTEGER,
ADD COLUMN     "stripe_customer_id" TEXT;

-- AlterTable
ALTER TABLE "match_results" ADD COLUMN     "gross_score" INTEGER,
ADD COLUMN     "net_score" DECIMAL(5,1),
ADD COLUMN     "stableford_points" INTEGER;

-- AlterTable
ALTER TABLE "players" ADD COLUMN     "stripe_customer_id" TEXT;

-- AlterTable
ALTER TABLE "sponsors" ADD COLUMN     "ad_image_url" TEXT,
ADD COLUMN     "ad_text" TEXT;

-- AlterTable
ALTER TABLE "tournament_stages" ADD COLUMN     "qualify_count" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN     "enable_leaderboard" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "tournament_stage_regions" (
    "id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "region_id" TEXT NOT NULL,

    CONSTRAINT "tournament_stage_regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prizes" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "stage_id" TEXT,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "value_pence" INTEGER,
    "prize_type" TEXT NOT NULL DEFAULT 'trophy',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_records" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "stage" "TournamentStage" NOT NULL,
    "gross_score" INTEGER NOT NULL,
    "handicap_at_play" DECIMAL(4,1) NOT NULL,
    "slope_rating" INTEGER NOT NULL,
    "course_rating" DECIMAL(4,1) NOT NULL,
    "par" INTEGER NOT NULL,
    "net_score" DECIMAL(5,1) NOT NULL,
    "adjusted_score" DECIMAL(5,1) NOT NULL,
    "stableford_points" INTEGER,
    "played_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_memberships" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'standard',
    "amount_pence" INTEGER NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripe_subscription_id" TEXT,
    "stripe_customer_id" TEXT,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_tiers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "amount_pence" INTEGER NOT NULL,
    "features" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_subscriptions" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "tier_id" TEXT NOT NULL,
    "amount_pence" INTEGER NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripe_subscription_id" TEXT,
    "stripe_customer_id" TEXT,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_offerings" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "offering_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price_pence" INTEGER,
    "original_price_pence" INTEGER,
    "valid_from" TIMESTAMP(3),
    "valid_to" TIMESTAMP(3),
    "max_redemptions" INTEGER,
    "redemption_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tournament_stage_regions_stage_id_region_id_key" ON "tournament_stage_regions"("stage_id", "region_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_tiers_name_key" ON "subscription_tiers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_tiers_slug_key" ON "subscription_tiers"("slug");

-- AddForeignKey
ALTER TABLE "tournament_stage_regions" ADD CONSTRAINT "tournament_stage_regions_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "tournament_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_stage_regions" ADD CONSTRAINT "tournament_stage_regions_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prizes" ADD CONSTRAINT "prizes_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prizes" ADD CONSTRAINT "prizes_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "tournament_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_records" ADD CONSTRAINT "score_records_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_records" ADD CONSTRAINT "score_records_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_records" ADD CONSTRAINT "score_records_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_memberships" ADD CONSTRAINT "player_memberships_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_subscriptions" ADD CONSTRAINT "club_subscriptions_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_subscriptions" ADD CONSTRAINT "club_subscriptions_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "subscription_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
