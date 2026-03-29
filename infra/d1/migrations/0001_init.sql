-- Migration: 0001_init
-- Runs schema + indexes
-- Apply with: wrangler d1 execute parthub-db --file=infra/d1/schema.sql
-- Apply with: wrangler d1 execute parthub-db --file=infra/d1/indexes.sql
-- This file is a record only. Run schema.sql + indexes.sql directly.
SELECT 'Migration 0001: initial schema' as migration;
