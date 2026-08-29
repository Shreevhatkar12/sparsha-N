-- AlterTable
-- Adds optional clock-time fields to activities (stored as "HH:mm" 24h
-- strings; the UI renders/collects them with a 12-hour AM/PM picker).
ALTER TABLE "activities" ADD COLUMN "start_time" TEXT;
ALTER TABLE "activities" ADD COLUMN "end_time" TEXT;
