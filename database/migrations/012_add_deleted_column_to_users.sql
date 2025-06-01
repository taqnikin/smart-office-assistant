-- Migration: Add 'deleted' column to users table for soft delete
ALTER TABLE users ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT FALSE; 