-- CreateEnum
CREATE TYPE "TeeTimeStatus" AS ENUM ('OPEN', 'FILLED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InterestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EntryStatus" ADD VALUE 'LEAGUE_ACTIVE';
ALTER TYPE "EntryStatus" ADD VALUE 'LEAGUE_COMPLETED';

-- AlterEnum
ALTER TYPE "TournamentStage" ADD VALUE 'REGIONAL_LEAGUE';

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "current_hole" INTEGER,
ADD COLUMN     "game_week" INTEGER,
ADD COLUMN     "holes_remaining_margin" INTEGER,
ADD COLUMN     "holes_up_margin" INTEGER,
ADD COLUMN     "is_home_for_player_a" BOOLEAN,
ADD COLUMN     "league_bonus_detail_a" JSONB,
ADD COLUMN     "league_bonus_detail_b" JSONB,
ADD COLUMN     "league_points_a" INTEGER,
ADD COLUMN     "league_points_b" INTEGER,
ADD COLUMN     "match_ended_at" TIMESTAMP(3),
ADD COLUMN     "match_started_at" TIMESTAMP(3),
ADD COLUMN     "round_deadline" TIMESTAMP(3),
ADD COLUMN     "score_submissions" JSONB;

-- AlterTable
ALTER TABLE "player_memberships" ADD COLUMN     "expiry_notif_sent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminder_30_sent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminder_7_sent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "renewed_from_id" TEXT;

-- AlterTable
ALTER TABLE "tournament_stages" ADD COLUMN     "away_match_count" INTEGER,
ADD COLUMN     "home_match_count" INTEGER,
ADD COLUMN     "is_league" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "league_match_count" INTEGER,
ADD COLUMN     "match_deadline_days_per_week" INTEGER;

-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN     "league_draw_stage_id" TEXT,
ADD COLUMN     "league_match_count" INTEGER,
ADD COLUMN     "league_scoring_config" JSONB;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verify_expiry" TIMESTAMP(3),
ADD COLUMN     "email_verify_token" TEXT,
ADD COLUMN     "reset_token" TEXT,
ADD COLUMN     "reset_token_expiry" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "league_standings" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "played" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "league_points" INTEGER NOT NULL DEFAULT 0,
    "bonus_points" INTEGER NOT NULL DEFAULT 0,
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "holes_won" INTEGER NOT NULL DEFAULT 0,
    "holes_lost" INTEGER NOT NULL DEFAULT 0,
    "holes_differential" INTEGER NOT NULL DEFAULT 0,
    "away_wins" INTEGER NOT NULL DEFAULT 0,
    "home_wins" INTEGER NOT NULL DEFAULT 0,
    "matches_reached_18" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER,
    "qualified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "league_standings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_season_points" (
    "id" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "region_id" TEXT,
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "player_count" INTEGER NOT NULL DEFAULT 0,
    "matches_played" INTEGER NOT NULL DEFAULT 0,
    "matches_won" INTEGER NOT NULL DEFAULT 0,
    "league_qualifiers" INTEGER NOT NULL DEFAULT 0,
    "national_qualifiers" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_season_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_posts" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author_id" TEXT,
    "match_id" TEXT,
    "tournament_id" TEXT,
    "club_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_comments" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_reactions" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'like',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_messages" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_check_ins" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "club_id" TEXT,
    "checked_in_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "match_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsor_ad_impressions" (
    "id" TEXT NOT NULL,
    "sponsor_id" TEXT NOT NULL,
    "placement" TEXT NOT NULL,
    "match_id" TEXT,
    "tournament_id" TEXT,
    "viewer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sponsor_ad_impressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referrer_player_id" TEXT NOT NULL,
    "referral_code" TEXT NOT NULL,
    "referred_email" TEXT,
    "referred_player_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "discount_pence" INTEGER NOT NULL DEFAULT 500,
    "referrer_credited" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemed_at" TIMESTAMP(3),

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_photos" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "hole_number" INTEGER,
    "caption" TEXT,
    "image_url" TEXT NOT NULL,
    "uploaded_by_id" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_highlights" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "club_id" TEXT,
    "title" TEXT NOT NULL,
    "video_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "duration_sec" INTEGER,
    "uploaded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_highlights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "is_secret" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "user_email" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "details" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Announcement',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "published_at" TIMESTAMP(3),
    "author_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_posts" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "images" JSONB,
    "tagged_club_id" TEXT,
    "tagged_tournament_id" TEXT,
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "comments_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_likes" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_comments" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_follows" (
    "id" TEXT NOT NULL,
    "follower_id" TEXT NOT NULL,
    "following_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "open_tee_times" (
    "id" TEXT NOT NULL,
    "poster_id" TEXT NOT NULL,
    "club_id" TEXT,
    "course_name" TEXT,
    "tee_time" TIMESTAMP(3) NOT NULL,
    "spots_available" INTEGER NOT NULL DEFAULT 1,
    "green_fee_pence" INTEGER,
    "notes" TEXT,
    "status" "TeeTimeStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "open_tee_times_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tee_time_interests" (
    "id" TEXT NOT NULL,
    "tee_time_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "message" TEXT,
    "status" "InterestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tee_time_interests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "league_standings_tournament_id_stage_id_player_id_key" ON "league_standings"("tournament_id", "stage_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "club_season_points_season_club_id_key" ON "club_season_points"("season", "club_id");

-- CreateIndex
CREATE UNIQUE INDEX "feed_reactions_post_id_player_id_type_key" ON "feed_reactions"("post_id", "player_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "match_check_ins_match_id_player_id_key" ON "match_check_ins"("match_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referral_code_key" ON "referrals"("referral_code");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs"("entity");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "news_articles_published_idx" ON "news_articles"("published");

-- CreateIndex
CREATE INDEX "news_articles_created_at_idx" ON "news_articles"("created_at");

-- CreateIndex
CREATE INDEX "player_posts_player_id_created_at_idx" ON "player_posts"("player_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "post_likes_post_id_player_id_key" ON "post_likes"("post_id", "player_id");

-- CreateIndex
CREATE INDEX "post_comments_post_id_created_at_idx" ON "post_comments"("post_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "player_follows_follower_id_following_id_key" ON "player_follows"("follower_id", "following_id");

-- CreateIndex
CREATE INDEX "open_tee_times_status_tee_time_idx" ON "open_tee_times"("status", "tee_time");

-- CreateIndex
CREATE INDEX "open_tee_times_poster_id_idx" ON "open_tee_times"("poster_id");

-- CreateIndex
CREATE UNIQUE INDEX "tee_time_interests_tee_time_id_player_id_key" ON "tee_time_interests"("tee_time_id", "player_id");

-- CreateIndex
CREATE INDEX "player_memberships_status_current_period_end_idx" ON "player_memberships"("status", "current_period_end");

-- AddForeignKey
ALTER TABLE "league_standings" ADD CONSTRAINT "league_standings_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_standings" ADD CONSTRAINT "league_standings_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "tournament_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_standings" ADD CONSTRAINT "league_standings_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_season_points" ADD CONSTRAINT "club_season_points_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_season_points" ADD CONSTRAINT "club_season_points_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "feed_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_reactions" ADD CONSTRAINT "feed_reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "feed_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_reactions" ADD CONSTRAINT "feed_reactions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_messages" ADD CONSTRAINT "match_messages_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_messages" ADD CONSTRAINT "match_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_check_ins" ADD CONSTRAINT "match_check_ins_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_check_ins" ADD CONSTRAINT "match_check_ins_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_check_ins" ADD CONSTRAINT "match_check_ins_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsor_ad_impressions" ADD CONSTRAINT "sponsor_ad_impressions_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "sponsors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsor_ad_impressions" ADD CONSTRAINT "sponsor_ad_impressions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsor_ad_impressions" ADD CONSTRAINT "sponsor_ad_impressions_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_player_id_fkey" FOREIGN KEY ("referrer_player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_player_id_fkey" FOREIGN KEY ("referred_player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_photos" ADD CONSTRAINT "course_photos_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_photos" ADD CONSTRAINT "course_photos_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_highlights" ADD CONSTRAINT "video_highlights_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_highlights" ADD CONSTRAINT "video_highlights_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_highlights" ADD CONSTRAINT "video_highlights_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_posts" ADD CONSTRAINT "player_posts_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "player_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "player_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_follows" ADD CONSTRAINT "player_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_follows" ADD CONSTRAINT "player_follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "open_tee_times" ADD CONSTRAINT "open_tee_times_poster_id_fkey" FOREIGN KEY ("poster_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "open_tee_times" ADD CONSTRAINT "open_tee_times_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tee_time_interests" ADD CONSTRAINT "tee_time_interests_tee_time_id_fkey" FOREIGN KEY ("tee_time_id") REFERENCES "open_tee_times"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tee_time_interests" ADD CONSTRAINT "tee_time_interests_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

