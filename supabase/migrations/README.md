# Supabase SQL Migrations

All SQL migrations for this project are stored in this directory.

## Naming convention

Files use timestamp-prefixed names:

`YYYYMMDDHHMMSS_description.sql`

This guarantees deterministic ordering.

## How to apply

Apply migrations in timestamp order using your normal Supabase migration workflow.

## Current migration groups

- Customer data and policies
- Access control and permission model
- RLS and security hardening
- Schema isolation infrastructure

## Notes

- Keep migrations additive and idempotent when possible.
- Do not edit old applied migrations in place; add a new migration instead.
