-- Optional reset script for development/test data.
-- Run this before schema.sql only if you want to delete all exercise data.
drop table if exists public.exercise_entries cascade;
drop table if exists public.exercises cascade;
