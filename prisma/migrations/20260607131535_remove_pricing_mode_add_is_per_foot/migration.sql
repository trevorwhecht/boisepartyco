-- AlterTable
ALTER TABLE "Item" DROP COLUMN "pricingMode",
ADD COLUMN "isPerFoot" BOOLEAN NOT NULL DEFAULT false;
