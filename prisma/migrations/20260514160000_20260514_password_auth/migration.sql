-- AlterTable
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- DropForeignKey
ALTER TABLE "MagicLink" DROP CONSTRAINT "MagicLink_userId_fkey";

-- DropTable
DROP TABLE "MagicLink";
