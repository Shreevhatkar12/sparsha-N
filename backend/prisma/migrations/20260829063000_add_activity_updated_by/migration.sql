-- AlterTable
-- Tracks who last edited an activity, separate from who originally created
-- it, so the Activities page can show a real teacher/staff name instead of
-- just "who created it".
ALTER TABLE "activities" ADD COLUMN "updated_by" UUID;

ALTER TABLE "activities"
  ADD CONSTRAINT "activities_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
