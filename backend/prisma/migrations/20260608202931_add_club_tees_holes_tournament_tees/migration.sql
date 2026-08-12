-- AlterTable
ALTER TABLE "clubs" ADD COLUMN     "course_api_id" TEXT,
ADD COLUMN     "course_provider" TEXT;

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

-- CreateIndex
CREATE UNIQUE INDEX "club_tees_club_id_tee_name_key" ON "club_tees"("club_id", "tee_name");

-- CreateIndex
CREATE UNIQUE INDEX "club_tee_holes_club_tee_id_hole_number_key" ON "club_tee_holes"("club_tee_id", "hole_number");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_tees_tournament_id_club_tee_id_key" ON "tournament_tees"("tournament_id", "club_tee_id");

-- AddForeignKey
ALTER TABLE "club_tees" ADD CONSTRAINT "club_tees_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_tee_holes" ADD CONSTRAINT "club_tee_holes_club_tee_id_fkey" FOREIGN KEY ("club_tee_id") REFERENCES "club_tees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_tees" ADD CONSTRAINT "tournament_tees_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_tees" ADD CONSTRAINT "tournament_tees_club_tee_id_fkey" FOREIGN KEY ("club_tee_id") REFERENCES "club_tees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
