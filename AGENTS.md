<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# BSRM Meeting Room Booking — Instructions

Always read [PROJECT_SPEC.md](PROJECT_SPEC.md) before making any changes — it is the source of truth for this project.

The user is a beginner. Explain each step in plain language as you go.

We follow the 10-day plan in spec section 6. Stay within the current day's scope — don't build ahead.

## Tech stack (spec section 8)
- Next.js (App Router) + TypeScript
- PostgreSQL, hosted on Neon
- Prisma ORM
- Auth.js, credentials provider, session-based
- Tailwind CSS + shadcn/ui
- Hosting: Vercel
- Timezone: Asia/Dhaka (UTC+6) — store times in UTC, display in Dhaka time
