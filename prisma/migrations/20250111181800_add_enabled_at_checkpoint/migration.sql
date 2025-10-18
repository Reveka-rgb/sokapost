-- AlterTable
-- Add enabledAt timestamp to track when auto-reply was enabled
-- This prevents replying to old comments that existed before activation
ALTER TABLE "auto_reply_settings" ADD COLUMN "enabledAt" TIMESTAMP(3);
