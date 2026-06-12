Loaded Prisma config from prisma.config.ts.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CLUB_MANAGER', 'PLAYER');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'DRAW_PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FormatType" AS ENUM ('SINGLES_MATCHPLAY', 'SINGLES_STROKEPLAY', 'SINGLES_STABLEFORD', 'PAIRS_MATCHPLAY', 'PAIRS_BESTBALL', 'PAIRS_FOURSOMES', 'PAIRS_GREENSOMES', 'TEAM_MATCHPLAY', 'TEAM_STROKEPLAY', 'TEAM_STABLEFORD');

-- CreateEnum
CREATE TYPE "ScoringSystem" AS ENUM ('MATCHPLAY', 'STROKEPLAY', 'STABLEFORD', 'BEST_BALL');

-- CreateEnum
CREATE TYPE "TournamentStage" AS ENUM ('CLUB_QUALIFIER', 'REGIONAL', 'REGIONAL_LEAGUE', 'NATIONAL_FINAL');

-- CreateEnum
CREATE TYPE "AgeCategory" AS ENUM ('OPEN', 'JUNIOR', 'SENIOR');

-- CreateEnum
CREATE TYPE "GenderCategory" AS ENUM ('MEN', 'WOMEN', 'MIXED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'SCHEDULED', 'IN_PROGRESS', 'RESULT_SUBMITTED', 'RESULT_CONFIRMED', 'COMPLETED', 'WALKOVER', 'DISPUTED');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('REGISTERED', 'PAYMENT_PENDING', 'ACTIVE', 'ELIMINATED', 'WITHDRAWN', 'DISQUALIFIED', 'PROMOTED', 'LEAGUE_ACTIVE', 'LEAGUE_COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "SponsorTier" AS ENUM ('NATIONAL', 'REGIONAL', 'LOCAL', 'CLUB');

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('ENTRY_FEE', 'LATE_ENTRY', 'PLAYER_MEMBERSHIP', 'CLUB_SUBSCRIPTION', 'SPECTATOR', 'OTHER');

-- CreateEnum
CREATE TYPE "RevenueType" AS ENUM ('ENTRY_FEE', 'SPONSORSHIP', 'ADVERTISING', 'MEMBERSHIP', 'CLUB_SUBSCRIPTION', 'OTHER');

-- CreateEnum
CREATE TYPE "DrawStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PAST_DUE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PLAYER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verify_token" TEXT,
    "email_verify_expiry" TIMESTAMP(3),
    "reset_token" TEXT,
    "reset_token_expiry" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "avatar_url" TEXT,
    "home_club_id" TEXT,
    "whs_handicap_id" TEXT,
    "handicap_index" DECIMAL(4,1),
    "ranking_points" INTEGER NOT NULL DEFAULT 0,
    "membership_type" TEXT NOT NULL DEFAULT 'free',
    "membership_expiry" TIMESTAMP(3),
    "stripe_customer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clubs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "course_api_id" TEXT,
    "course_provider" TEXT,
    "address" TEXT,
    "city" TEXT,
    "county" TEXT,
    "postcode" TEXT,
    "region_id" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logo_url" TEXT,
    "description" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "slope_rating" INTEGER,
    "course_rating" DECIMAL(4,1),
    "par" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "stripe_customer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_tees" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "tee_api_id" TEXT,
    "tee_name" TEXT NOT NULL,
    "gender" TEXT NOT NULL DEFAULT 'Male',
    "slope_rating" INTEGER,
    "course_rating" DECIMAL(4,1),
    "bogey_rating" DECIMAL(4,1),
    "par" INTEGER,
    "total_yards" INTEGER,
    "total_meters" INTEGER,
    "number_of_holes" INTEGER NOT NULL DEFAULT 18,

    CONSTRAINT "club_tees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_tee_holes" (
    "id" TEXT NOT NULL,
    "club_tee_id" TEXT NOT NULL,
    "hole_number" INTEGER NOT NULL,
    "par" INTEGER NOT NULL,
    "yards" INTEGER,
    "meters" INTEGER,
    "stroke_index" INTEGER,

    CONSTRAINT "club_tee_holes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_tees" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "club_tee_id" TEXT NOT NULL,
    "gender" TEXT NOT NULL DEFAULT 'Male',
    "is_default" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tournament_tees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_managers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_managers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "description" TEXT,
    "rules_text" TEXT,
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "format_type" "FormatType" NOT NULL,
    "scoring_system" "ScoringSystem" NOT NULL,
    "team_size" INTEGER NOT NULL DEFAULT 1,
    "is_knockout" BOOLEAN NOT NULL DEFAULT true,
    "handicap_allowance_pct" INTEGER NOT NULL DEFAULT 100,
    "max_handicap" DECIMAL(4,1),
    "age_category" "AgeCategory" NOT NULL DEFAULT 'OPEN',
    "gender_category" "GenderCategory" NOT NULL DEFAULT 'MIXED',
    "min_age" INTEGER,
    "max_age" INTEGER,
    "enable_leaderboard" BOOLEAN NOT NULL DEFAULT false,
    "stableford_config" JSONB,
    "registration_opens" TIMESTAMP(3),
    "registration_deadline" TIMESTAMP(3),
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "banner_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "league_scoring_config" JSONB,
    "league_match_count" INTEGER,
    "league_draw_stage_id" TEXT,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_stages" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "stage" "TournamentStage" NOT NULL,
    "stage_order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "max_participants" INTEGER,
    "total_rounds" INTEGER NOT NULL DEFAULT 1,
    "qualify_count" INTEGER NOT NULL DEFAULT 1,
    "match_deadline_days" INTEGER,
    "feeds_into_stage_id" TEXT,
    "is_league" BOOLEAN NOT NULL DEFAULT false,
    "league_match_count" INTEGER,
    "home_match_count" INTEGER,
    "away_match_count" INTEGER,
    "match_deadline_days_per_week" INTEGER,

    CONSTRAINT "tournament_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_stage_regions" (
    "id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "region_id" TEXT NOT NULL,

    CONSTRAINT "tournament_stage_regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_club_stages" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "max_entries" INTEGER,
    "qualify_count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "tournament_club_stages_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "tournament_pricing" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "fee_type" "FeeType" NOT NULL,
    "amount_pence" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "club_share_pct" INTEGER NOT NULL,
    "platform_share_pct" INTEGER NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_pricing" (
    "id" TEXT NOT NULL,
    "pricing_key" TEXT NOT NULL,
    "amount_pence" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "description" TEXT,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_entries" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "stage" "TournamentStage" NOT NULL DEFAULT 'CLUB_QUALIFIER',
    "entry_fee_paid_pence" INTEGER,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripe_payment_id" TEXT,
    "handicap_at_entry" DECIMAL(4,1),
    "seed" INTEGER,
    "status" "EntryStatus" NOT NULL DEFAULT 'REGISTERED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "draws" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "stage" "TournamentStage" NOT NULL,
    "round_number" INTEGER NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" "DrawStatus" NOT NULL DEFAULT 'SCHEDULED',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draws_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "stage" "TournamentStage" NOT NULL,
    "round_number" INTEGER NOT NULL,
    "match_number" INTEGER NOT NULL,
    "player_a_id" TEXT,
    "player_b_id" TEXT,
    "venue_club_id" TEXT,
    "scheduled_date" TIMESTAMP(3),
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "winner_id" TEXT,
    "scorecard" JSONB,
    "played_at" TIMESTAMP(3),
    "next_match_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "game_week" INTEGER,
    "is_home_for_player_a" BOOLEAN,
    "holes_up_margin" INTEGER,
    "holes_remaining_margin" INTEGER,
    "league_points_a" INTEGER,
    "league_points_b" INTEGER,
    "league_bonus_detail_a" JSONB,
    "league_bonus_detail_b" JSONB,
    "score_submissions" JSONB,
    "round_deadline" TIMESTAMP(3),
    "match_started_at" TIMESTAMP(3),
    "match_ended_at" TIMESTAMP(3),
    "current_hole" INTEGER,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_results" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "result_text" TEXT NOT NULL,
    "gross_score" INTEGER,
    "net_score" DECIMAL(5,1),
    "stableford_points" INTEGER,
    "scorecard_url" TEXT,
    "submitted_by_id" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_by_id" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "is_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "dispute_reason" TEXT,

    CONSTRAINT "match_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_hole_scores" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "hole_number" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "putts" INTEGER,
    "fairway_hit" BOOLEAN,

    CONSTRAINT "match_hole_scores_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "sponsors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT,
    "website" TEXT,
    "tier" "SponsorTier" NOT NULL,
    "region_id" TEXT,
    "club_id" TEXT,
    "tournament_id" TEXT,
    "contact_name" TEXT,
    "contact_email" TEXT,
    "ad_image_url" TEXT,
    "ad_text" TEXT,
    "contract_start" TIMESTAMP(3),
    "contract_end" TIMESTAMP(3),
    "annual_fee_pence" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_transactions" (
    "id" TEXT NOT NULL,
    "type" "RevenueType" NOT NULL,
    "total_amount_pence" INTEGER NOT NULL,
    "club_amount_pence" INTEGER NOT NULL DEFAULT 0,
    "platform_amount_pence" INTEGER NOT NULL DEFAULT 0,
    "club_id" TEXT,
    "tournament_id" TEXT,
    "player_id" TEXT,
    "stripe_payment_id" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_transactions_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "players_user_id_key" ON "players"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "clubs_slug_key" ON "clubs"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "club_tees_club_id_tee_name_key" ON "club_tees"("club_id", "tee_name");

-- CreateIndex
CREATE UNIQUE INDEX "club_tee_holes_club_tee_id_hole_number_key" ON "club_tee_holes"("club_tee_id", "hole_number");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_tees_tournament_id_club_tee_id_key" ON "tournament_tees"("tournament_id", "club_tee_id");

-- CreateIndex
CREATE UNIQUE INDEX "club_managers_user_id_key" ON "club_managers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "regions_name_key" ON "regions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "regions_slug_key" ON "regions"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_slug_key" ON "tournaments"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_stage_regions_stage_id_region_id_key" ON "tournament_stage_regions"("stage_id", "region_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_club_stages_tournament_id_club_id_key" ON "tournament_club_stages"("tournament_id", "club_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_pricing_pricing_key_key" ON "platform_pricing"("pricing_key");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_entries_tournament_id_player_id_key" ON "tournament_entries"("tournament_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_results_match_id_key" ON "match_results"("match_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_hole_scores_match_id_player_id_hole_number_key" ON "match_hole_scores"("match_id", "player_id", "hole_number");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_tiers_name_key" ON "subscription_tiers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_tiers_slug_key" ON "subscription_tiers"("slug");

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

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_home_club_id_fkey" FOREIGN KEY ("home_club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_tees" ADD CONSTRAINT "club_tees_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_tee_holes" ADD CONSTRAINT "club_tee_holes_club_tee_id_fkey" FOREIGN KEY ("club_tee_id") REFERENCES "club_tees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_tees" ADD CONSTRAINT "tournament_tees_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_tees" ADD CONSTRAINT "tournament_tees_club_tee_id_fkey" FOREIGN KEY ("club_tee_id") REFERENCES "club_tees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_managers" ADD CONSTRAINT "club_managers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_managers" ADD CONSTRAINT "club_managers_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_stages" ADD CONSTRAINT "tournament_stages_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_stages" ADD CONSTRAINT "tournament_stages_feeds_into_stage_id_fkey" FOREIGN KEY ("feeds_into_stage_id") REFERENCES "tournament_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_stage_regions" ADD CONSTRAINT "tournament_stage_regions_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "tournament_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_stage_regions" ADD CONSTRAINT "tournament_stage_regions_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_club_stages" ADD CONSTRAINT "tournament_club_stages_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_club_stages" ADD CONSTRAINT "tournament_club_stages_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prizes" ADD CONSTRAINT "prizes_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prizes" ADD CONSTRAINT "prizes_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "tournament_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_pricing" ADD CONSTRAINT "tournament_pricing_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_entries" ADD CONSTRAINT "tournament_entries_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_entries" ADD CONSTRAINT "tournament_entries_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_entries" ADD CONSTRAINT "tournament_entries_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draws" ADD CONSTRAINT "draws_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_player_a_id_fkey" FOREIGN KEY ("player_a_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_player_b_id_fkey" FOREIGN KEY ("player_b_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_venue_club_id_fkey" FOREIGN KEY ("venue_club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_next_match_id_fkey" FOREIGN KEY ("next_match_id") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_confirmed_by_id_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_hole_scores" ADD CONSTRAINT "match_hole_scores_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_hole_scores" ADD CONSTRAINT "match_hole_scores_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_records" ADD CONSTRAINT "score_records_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_records" ADD CONSTRAINT "score_records_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_records" ADD CONSTRAINT "score_records_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_memberships" ADD CONSTRAINT "player_memberships_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_subscriptions" ADD CONSTRAINT "club_subscriptions_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_subscriptions" ADD CONSTRAINT "club_subscriptions_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "subscription_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

