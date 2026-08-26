-- AlterEnum
-- Adds a brand new "general_volunteer" role, separate from the existing
-- "volunteer" enum value (which is actually used for Digital Literacy
-- teachers in this app). This new role is for short-term/rotating college
-- volunteers who help teachers/staff with general tasks.
ALTER TYPE "UserRole" ADD VALUE 'general_volunteer';
