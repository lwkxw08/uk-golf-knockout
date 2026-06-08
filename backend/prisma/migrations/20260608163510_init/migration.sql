-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CLUB_MANAGER', 'PLAYER');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'DRAW_PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FormatType" AS ENUM ('SINGLES_MATCHPLAY', 'SINGLES_STROKEPLAY', 'SINGLES_STABLEFORD', 'PAIRS_MATCHPLAY', 'PAIRS_BESTBALL', 'PAIRS_FOURSOMES', 'PAIRS_GREENSOMES', 'TEAM_MATCHPLAY', 'TEAM_STROKEPLAY', 'TEAM_STABLEFORD');

-- CreateEnum
CREATE TYPE "ScoringSystem" AS ENUM ('MATCHPLAY', 'STROKEPLAY', 'STABLEFORD', 'BEST_BALL');

-- CreateEnum
CREATE TYPE "TournamentStage" AS ENUM ('CLUB_QUALIFIER', 'REGIONAL', 'NATIONAL_FINAL');

-- CreateEnum
CREATE TYPE "AgeCategory" AS ENUM ('OPEN', 'JUNIOR', 'SENIOR');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'SCHEDULED', 'IN_PROGRESS', 'RESULT_SUBMITTED', 'RESULT_CONFIRMED', 'COMPLETED', 'WALKOVER', 'DISPUTED');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('REGISTERED', 'PAYMENT_PENDING', 'ACTIVE', 'ELIMINATED', 'WITHDRAWN', 'DISQUALIFIED');

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

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PLAYER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clubs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
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
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
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
    "min_age" INTEGER,
    "max_age" INTEGER,
    "registration_opens" TIMESTAMP(3),
    "registration_deadline" TIMESTAMP(3),
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "banner_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_stages" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "stage" "TournamentStage" NOT NULL,
    "stage_order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "total_rounds" INTEGER NOT NULL DEFAULT 1,
    "match_deadline_days" INTEGER,

    CONSTRAINT "tournament_stages_pkey" PRIMARY KEY ("id")
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

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_results" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "result_text" TEXT NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "players_user_id_key" ON "players"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "clubs_slug_key" ON "clubs"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "club_managers_user_id_key" ON "club_managers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "regions_name_key" ON "regions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "regions_slug_key" ON "regions"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_slug_key" ON "tournaments"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_stages_tournament_id_stage_key" ON "tournament_stages"("tournament_id", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_club_stages_tournament_id_club_id_key" ON "tournament_club_stages"("tournament_id", "club_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_pricing_pricing_key_key" ON "platform_pricing"("pricing_key");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_entries_tournament_id_player_id_key" ON "tournament_entries"("tournament_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_results_match_id_key" ON "match_results"("match_id");

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_home_club_id_fkey" FOREIGN KEY ("home_club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_managers" ADD CONSTRAINT "club_managers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_managers" ADD CONSTRAINT "club_managers_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_stages" ADD CONSTRAINT "tournament_stages_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_club_stages" ADD CONSTRAINT "tournament_club_stages_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_club_stages" ADD CONSTRAINT "tournament_club_stages_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
