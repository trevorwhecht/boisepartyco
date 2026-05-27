-- AlterTable
ALTER TABLE "notification_settings" ADD COLUMN     "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailRecipients" TEXT;
