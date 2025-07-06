-- Create enum types
CREATE TYPE "TestType" AS ENUM ('STRESS_TEST', 'PERFORMANCE_TEST', 'COMPARISON_TEST');
CREATE TYPE "Database" AS ENUM ('MONGODB', 'ELASTICSEARCH');
CREATE TYPE "OperationType" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'SEARCH', 'AGGREGATE');

-- Create User table
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Create TestResult table
CREATE TABLE IF NOT EXISTS "TestResult" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "testType" "TestType" NOT NULL,
    "database" "Database" NOT NULL,
    "operationType" "OperationType" NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestResult_pkey" PRIMARY KEY ("id")
);

-- Create unique index on email
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- Create indexes
CREATE INDEX IF NOT EXISTS "TestResult_userId_idx" ON "TestResult"("userId");
CREATE INDEX IF NOT EXISTS "TestResult_createdAt_idx" ON "TestResult"("createdAt");

-- Add foreign key constraint
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for User table
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 