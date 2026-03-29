/*
  Warnings:

  - You are about to drop the column `action` on the `AuditLog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "action",
ADD COLUMN     "actionType" TEXT NOT NULL DEFAULT 'UNKNOWN';
