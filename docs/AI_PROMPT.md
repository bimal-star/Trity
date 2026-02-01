# AI Prompt for Regenerating TRITY_CONTEXT.md

Copy and paste the prompt below into Cursor whenever the project changes and you want to rebuild the TRITY_CONTEXT.md file based on the current state of the repository.

---

## The Prompt

I want you to generate or update a single file called `TRITY_CONTEXT.md` at the root of the repository. This file must give a complete, accurate, up-to-date overview of the entire project based ONLY on what exists in the current codebase and documentation.

Your tasks:

1. Scan the entire repository, including:
   - All source code
   - All folders and structure
   - All .md files
   - All helper functions
   - All database-related files
   - Any comments that imply conventions or rules

2. From this scan, extract and consolidate the following into `TRITY_CONTEXT.md`:
   - Project overview (what the system does, inferred from code)
   - Architecture summary (frontend, backend, database, multi-tenant model)
   - Coding conventions (naming, patterns, folder structure)
   - Database conventions (schema, audit fields, tenant_id usage)
   - RLS patterns (if present)
   - Versioning workflow (based on migrations and repo structure)
   - "Do Not Touch" areas (files or modules that appear foundational)
   - AI usage rules (how AI should behave when modifying this project)
   - Current TODOs or incomplete areas (based on inconsistencies or gaps you detect)

3. IMPORTANT RULES:
   - Do NOT invent new architecture or features.
   - Do NOT include outdated or contradictory information.
   - Only document what is actually present in the repo.
   - If conflicting patterns exist, document the conflict clearly.

4. Before writing the file, show me the full proposed contents of `TRITY_CONTEXT.md` for approval.

This prompt should be reusable. Every time I paste it, you should regenerate the file based on the current state of the repository.

---

## How to Use

1. Open Cursor AI
2. Copy the prompt from the section above
3. Paste it into Cursor
4. Review the proposed TRITY_CONTEXT.md content
5. Approve to regenerate the file

## When to Regenerate

- After adding new features or modules
- After changing database schema
- After modifying core architecture
- After updating coding conventions
- Periodically (e.g., monthly) to keep documentation fresh
