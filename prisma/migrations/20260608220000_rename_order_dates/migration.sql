-- Copy dueDate into startDate for rows where startDate is null
UPDATE "Order" SET "startDate" = "dueDate" WHERE "startDate" IS NULL AND "dueDate" IS NOT NULL;

-- Rename dueDateEnd to endDate
ALTER TABLE "Order" RENAME COLUMN "dueDateEnd" TO "endDate";

-- Drop the legacy dueDate column
ALTER TABLE "Order" DROP COLUMN "dueDate";
