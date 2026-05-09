-- AlterTable: make phone and password_hash nullable (Google users won't have these)
ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

-- AlterTable: add Google OAuth fields
ALTER TABLE "users" ADD COLUMN "google_id"     TEXT;
ALTER TABLE "users" ADD COLUMN "auth_provider" TEXT NOT NULL DEFAULT 'local';
ALTER TABLE "users" ADD COLUMN "profile_image" TEXT;

-- CreateIndex: unique google_id
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");
