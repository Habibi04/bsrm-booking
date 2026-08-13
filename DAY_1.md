# Day 1 — Environment + Project Skeleton + Database Connected

**Goal (from PROJECT_SPEC.md section 6):** The starter page opens in your browser and the database is reachable.

**Status: done.**

---

## 1. Project scaffolded

Ran `create-next-app` to generate the base app:
- Next.js (App Router) + TypeScript
- Tailwind CSS
- ESLint
- `src/` directory layout, with `@/*` import alias pointing at `src/*`

## 2. shadcn/ui initialized

Ran the shadcn CLI init, which set up `components.json` and added a sample `Button` component (`src/components/ui/button.tsx`) to confirm it works. Components are copied into the project as source, not installed as a package, so they can be freely edited later.

## 3. Prisma installed and connected to Neon

- Installed `prisma` (CLI) and `@prisma/client`.
- `prisma/schema.prisma` — PostgreSQL datasource, `prisma-client` generator outputting to `src/generated/prisma`.
- `prisma.config.ts` — holds the connection URL used by all CLI commands (`migrate`, `db push`, `studio`, etc). This project is on Prisma 7, which moved connection config out of `schema.prisma` and into this file.
- **Two connection strings, two jobs:**
  - `DATABASE_URL` (pooled, via Neon's connection pooler) — used by the app at runtime.
  - `DIRECT_URL` (unpooled, same database, `-pooler` removed from the hostname) — used for migrations. Neon's pooler runs in transaction mode and doesn't support the session features/advisory locks Prisma Migrate needs, so `prisma.config.ts` points at `DIRECT_URL` instead.
- Verified both connection strings work by running a live `SELECT 1` against Neon through the Prisma CLI.

## 4. Auth.js installed

Installed `next-auth@beta` (Auth.js v5). No login pages, providers, or session logic yet — that's Day 3. Generated a random `AUTH_SECRET` (used later to sign session tokens) and added it to `.env`.

## 5. `.env` created and protected

- `DATABASE_URL`, `DIRECT_URL`, and `AUTH_SECRET` are set in `.env` with your real Neon credentials.
- Confirmed `.env*` is covered by `.gitignore` — it will never be committed.

## 6. `src/lib/prisma.ts` — the app's database client

Wires up `PrismaClient` with the `@prisma/adapter-pg` driver adapter, reading the **pooled** `DATABASE_URL` directly from `process.env` at runtime (separate from `prisma.config.ts`, which is CLI-only). Uses the standard Next.js dev singleton pattern so hot-reload doesn't spawn a new connection pool on every file save.

Verified by temporarily adding an API route that ran `prisma.$queryRaw`, hitting it through a real running dev server, confirming a successful round-trip, then removing the test route.

## 7. Dev server verified

Homepage loads with no console errors.

**To run it yourself:**
```bash
npm run dev
```
Then open **http://localhost:3000** in your browser.

## 8. Project instructions for future sessions

Added project-specific instructions (always read `PROJECT_SPEC.md` first, explain steps in plain language, follow the 10-day plan, tech stack summary) to `AGENTS.md`, which Next.js already generates and keeps at the project root.

## 9. Git and GitHub

- Committed everything with a clean history — no AI-tool attribution or file names anywhere in the commit messages or tracked files.
- AI coding assistant config/tooling directories (`.claude/`, `.agents/`, `.windsurf/`, `CLAUDE.md`, `skills-lock.json`) are gitignored — they stay on disk locally but are never tracked or pushed.
- Created a public GitHub repository and pushed: **[github.com/Habibi04/bsrm-booking](https://github.com/Habibi04/bsrm-booking)**

---

## What's next (Day 2)

Write the full Prisma schema from spec section 3 and seed the database with starter data: 3 rooms, 8 facilities, 4 attendee types, 8 refreshment items, 7 refreshment rules, and 5 test users.
