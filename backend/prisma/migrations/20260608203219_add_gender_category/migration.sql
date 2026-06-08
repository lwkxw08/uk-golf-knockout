-- CreateEnum
CREATE TYPE "GenderCategory" AS ENUM ('MEN', 'WOMEN', 'MIXED');

-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN     "gender_category" "GenderCategory" NOT NULL DEFAULT 'MIXED';
