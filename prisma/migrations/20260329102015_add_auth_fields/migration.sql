/*
  Warnings:

  - You are about to drop the column `actionType` on the `AuditLog` table. All the data in the column will be lost.
  - Added the required column `action` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Company` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "actionType",
ADD COLUMN     "action" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
