-- Create enum for user roles
CREATE TYPE "UserRole" AS ENUM('CLIENT', 'ADMIN');

-- Add role column to users table with default value
ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'CLIENT';

-- Update existing users to have CLIENT role (they were previously using roleId)
UPDATE "users" SET "role" = 'CLIENT' WHERE "role" IS NOT NULL;

-- Optional: Drop the old roleId column (commented out for safety)
-- ALTER TABLE "users" DROP COLUMN "roleId";





