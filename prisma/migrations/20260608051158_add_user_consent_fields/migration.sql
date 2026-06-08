-- AlterTable
ALTER TABLE "User" ADD COLUMN     "consentEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consentSms" BOOLEAN NOT NULL DEFAULT false;
