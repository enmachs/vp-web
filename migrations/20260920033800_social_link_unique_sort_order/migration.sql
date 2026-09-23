-- Keep the earliest row at each sortOrder; extras get max+n so the unique
-- index can be created against databases that already have collisions.
WITH dups AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY "sortOrder" ORDER BY "createdAt" ASC NULLS LAST, id ASC) AS rn
  FROM "SocialLink"
),
extras AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS n
  FROM dups
  WHERE rn > 1
),
peak AS (
  SELECT COALESCE(MAX("sortOrder"), 0) AS m FROM "SocialLink"
)
UPDATE "SocialLink" AS s
SET "sortOrder" = peak.m + extras.n
FROM extras, peak
WHERE s.id = extras.id;

-- CreateIndex
CREATE UNIQUE INDEX "SocialLink_sortOrder_key" ON "SocialLink"("sortOrder");
