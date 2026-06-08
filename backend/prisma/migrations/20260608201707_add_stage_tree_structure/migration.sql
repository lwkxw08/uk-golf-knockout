-- DropIndex
DROP INDEX "tournament_stages_tournament_id_stage_key";

-- AlterTable
ALTER TABLE "tournament_stages" ADD COLUMN     "feeds_into_stage_id" TEXT;

-- AddForeignKey
ALTER TABLE "tournament_stages" ADD CONSTRAINT "tournament_stages_feeds_into_stage_id_fkey" FOREIGN KEY ("feeds_into_stage_id") REFERENCES "tournament_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
