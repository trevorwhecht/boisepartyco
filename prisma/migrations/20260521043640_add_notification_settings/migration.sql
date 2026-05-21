-- DropForeignKey
ALTER TABLE "CateringSpec" DROP CONSTRAINT "CateringSpec_itemId_fkey";

-- DropForeignKey
ALTER TABLE "ChairSpec" DROP CONSTRAINT "ChairSpec_itemId_fkey";

-- DropForeignKey
ALTER TABLE "DecorationSpec" DROP CONSTRAINT "DecorationSpec_itemId_fkey";

-- DropForeignKey
ALTER TABLE "FloorSpec" DROP CONSTRAINT "FloorSpec_itemId_fkey";

-- DropForeignKey
ALTER TABLE "HeaterSpec" DROP CONSTRAINT "HeaterSpec_itemId_fkey";

-- DropForeignKey
ALTER TABLE "LightingSpec" DROP CONSTRAINT "LightingSpec_itemId_fkey";

-- DropForeignKey
ALTER TABLE "LinenSpec" DROP CONSTRAINT "LinenSpec_itemId_fkey";

-- DropForeignKey
ALTER TABLE "TableSpec" DROP CONSTRAINT "TableSpec_itemId_fkey";

-- DropForeignKey
ALTER TABLE "TentSpec" DROP CONSTRAINT "TentSpec_itemId_fkey";

-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Item" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SerializedUnit" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TentConfigPart" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TentConfiguration" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TentPart" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "notification_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsPhone" TEXT,
    "onNewOrder" BOOLEAN NOT NULL DEFAULT true,
    "onStateChange" BOOLEAN NOT NULL DEFAULT true,
    "onPayment" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TentSpec" ADD CONSTRAINT "TentSpec_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChairSpec" ADD CONSTRAINT "ChairSpec_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableSpec" ADD CONSTRAINT "TableSpec_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinenSpec" ADD CONSTRAINT "LinenSpec_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecorationSpec" ADD CONSTRAINT "DecorationSpec_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeaterSpec" ADD CONSTRAINT "HeaterSpec_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FloorSpec" ADD CONSTRAINT "FloorSpec_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CateringSpec" ADD CONSTRAINT "CateringSpec_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LightingSpec" ADD CONSTRAINT "LightingSpec_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
