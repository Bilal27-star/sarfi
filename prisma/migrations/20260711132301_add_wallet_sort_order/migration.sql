-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill: preserve each user's existing wallet order (by createdAt) instead
-- of leaving every row tied at 0, which would make the new ORDER BY sortOrder
-- effectively random relative to what users see today.
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt" ASC) - 1 AS rn
  FROM "Wallet"
)
UPDATE "Wallet" AS w
SET "sortOrder" = ranked.rn
FROM ranked
WHERE w."id" = ranked."id";
