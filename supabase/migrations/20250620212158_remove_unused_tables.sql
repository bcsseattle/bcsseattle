-- Remove unused tables that are not used in production code

-- Drop the audit_logs table
-- This table was created for general system audit trails but is not used in the current application
DROP TABLE IF EXISTS "public"."audit_logs" CASCADE;

-- Drop the nominations table  
-- This table was created for a two-step nomination process but the current application
-- uses the candidates table directly for self-nominations
DROP TABLE IF EXISTS "public"."nominations" CASCADE;

-- Note: vote_confirmations table IS USED in production - do not remove
-- It's used by the voting system for confirmation tracking and receipts
-- vote_sessions table is also used for session management

-- Clean up any orphaned types or functions related to removed tables
-- (Add here if there were any specific to the removed tables)