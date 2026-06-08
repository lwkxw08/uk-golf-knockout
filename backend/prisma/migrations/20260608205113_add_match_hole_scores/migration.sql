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

-- CreateIndex
CREATE UNIQUE INDEX "match_hole_scores_match_id_player_id_hole_number_key" ON "match_hole_scores"("match_id", "player_id", "hole_number");

-- AddForeignKey
ALTER TABLE "match_hole_scores" ADD CONSTRAINT "match_hole_scores_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_hole_scores" ADD CONSTRAINT "match_hole_scores_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
