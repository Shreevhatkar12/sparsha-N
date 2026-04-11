/*
  Warnings:

  - The `gender` column on the `students` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `status` on the `attendance_records` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `exam_type` on the `exams` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `role` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'teacher', 'staff', 'volunteer', 'parent', 'shareholder');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('present', 'absent', 'late');

-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('baseline', 'endline');

-- AlterTable
ALTER TABLE "attendance_records" DROP COLUMN "status",
ADD COLUMN     "status" "AttendanceStatus" NOT NULL;

-- AlterTable
ALTER TABLE "exams" DROP COLUMN "exam_type",
ADD COLUMN     "exam_type" "ExamType" NOT NULL;

-- AlterTable
ALTER TABLE "students" DROP COLUMN "gender",
ADD COLUMN     "gender" "Gender";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL;

-- DropEnum
DROP TYPE "attendance_status";

-- DropEnum
DROP TYPE "exam_type";

-- DropEnum
DROP TYPE "gender";

-- DropEnum
DROP TYPE "user_role";
