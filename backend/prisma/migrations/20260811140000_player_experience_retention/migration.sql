-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DRAW_PUBLISHED', 'DRAW_SCHEDULED', 'MATCH_PROPOSAL', 'MATCH_SCHEDULED', 'MATCH_REMINDER', 'RESULT_SUBMITTED', 'RESULT_CONFIRMED', 'RESULT_DISPUTED', 'DEADLINE_WARNING', 'WALKOVER_APPLIED', 'STAGE_PROMOTION', 'ACHIEVEMENT_UNLOCKED', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "AvailabilitySlot" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "AchievementTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD');

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "deadline_reminders_sent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scheduled_slot" "AvailabilitySlot",
ADD COLUMN     "share_token" TEXT,
ADD COLUMN     "spectator_views" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "walkover_applied_at" TIMESTAMP(3),
ADD COLUMN     "walkover_reason" TEXT;

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "email" BOOLEAN NOT NULL DEFAULT true,
    "push" BOOLEAN NOT NULL DEFAULT true,
    "muted_types" "NotificationType"[],
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_availability" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "slot" "AvailabilitySlot" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_schedule_proposals" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "proposed_by_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "slot" "AvailabilitySlot" NOT NULL,
    "venue_club_id" TEXT,
    "message" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_schedule_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "tier" "AchievementTier" NOT NULL DEFAULT 'BRONZE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_achievements" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "match_id" TEXT,
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_player_id_is_read_created_at_idx" ON "notifications"("player_id", "is_read", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_player_id_idx" ON "push_subscriptions"("player_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_player_id_key" ON "notification_preferences"("player_id");

-- CreateIndex
CREATE INDEX "player_availability_date_idx" ON "player_availability"("date");

-- CreateIndex
CREATE UNIQUE INDEX "player_availability_player_id_date_slot_key" ON "player_availability"("player_id", "date", "slot");

-- CreateIndex
CREATE INDEX "match_schedule_proposals_match_id_status_idx" ON "match_schedule_proposals"("match_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_code_key" ON "achievements"("code");

-- CreateIndex
CREATE INDEX "player_achievements_player_id_idx" ON "player_achievements"("player_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_achievements_player_id_achievement_id_key" ON "player_achievements"("player_id", "achievement_id");

-- CreateIndex
CREATE UNIQUE INDEX "matches_share_token_key" ON "matches"("share_token");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_availability" ADD CONSTRAINT "player_availability_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_schedule_proposals" ADD CONSTRAINT "match_schedule_proposals_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_schedule_proposals" ADD CONSTRAINT "match_schedule_proposals_proposed_by_id_fkey" FOREIGN KEY ("proposed_by_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_achievements" ADD CONSTRAINT "player_achievements_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_achievements" ADD CONSTRAINT "player_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

