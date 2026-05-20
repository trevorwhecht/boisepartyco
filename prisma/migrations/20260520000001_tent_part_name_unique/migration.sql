-- Add unique constraint on TentPart.name for idempotent seed
CREATE UNIQUE INDEX "TentPart_name_key" ON "TentPart"("name");
