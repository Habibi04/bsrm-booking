# Day 3 — Login + the Three Roles

**Goal (from PROJECT_SPEC.md section 6):** You can log in as each of the 3 test roles and are blocked from pages you shouldn't see.

**Status: done.**

---

## 1. Auth.js v5 core config (`src/auth.ts`)

A `Credentials` provider checks email/password against the seeded `User` table:

- `session: { strategy: "jwt" }` — mandatory here, since the credentials provider has no persistent session record for a database-session strategy to look up.
- `pages: { signIn: "/login" }` — routes unauthenticated visitors to our own login page instead of Auth.js's built-in one.
- `authorize()`: trims and lowercases the incoming email (confirmed the 5 seeded addresses in `prisma/seed.ts` are already lowercase, so this makes login case-insensitive without changing how they're stored), looks the user up, and returns `null` — never a different shape, never a distinguishing error — if the user doesn't exist, is deactivated (`isActive === false`), or the password doesn't match via `bcryptjs`'s `compare(password, user.passwordHash)`. On success it returns exactly `{ id, name, email, role }`, never the raw database row, so the password hash can never end up in the session cookie.
- `jwt`/`session` callbacks copy `id` and `role` from the authorized user onto the token, then from the token onto `session.user`, since Auth.js's defaults only know about `name`/`email`/`image`.

## 2. The API route (`src/app/api/auth/[...nextauth]/route.ts`)

Two lines — `[...nextauth]` is Next.js's catch-all route syntax, so this one file handles every `/api/auth/*` sub-endpoint Auth.js needs (`session`, `csrf`, `callback/credentials`, etc.) via `handlers` exported from `auth.ts`.

## 3. TypeScript module augmentation (`src/types/next-auth.d.ts`)

Teaches TypeScript that `session.user` and the JWT carry `id`/`role`, with `role` typed as the actual Prisma `Role` enum rather than a hand-written string union.

**A real gotcha here:** augmenting `next-auth/jwt` directly silently failed the type check — `token.id`/`token.role` came back typed `unknown`. That module only does `export * from "@auth/core/jwt"` (a wildcard re-export), which TypeScript's declaration merging can't see through. The fix was augmenting `@auth/core/jwt` directly, where the interface is actually declared. (`User`/`Session` worked fine augmenting `next-auth` itself — that module re-exports those by name, which does merge correctly. It's an inconsistency in the library's own structure, not a mistake to repeat elsewhere.)

## 4. Login page and sign-out

- **`src/app/login/page.tsx`** — a genuine Server Component. Calls `await auth()` and redirects to `/` immediately if a session already exists, before rendering anything.
- **`src/app/login/actions.ts`** — the server action, `loginAction(formData: FormData)`. Calls `signIn("credentials", { email, password, redirectTo: "/" })` inside a try/catch. The catch block checks `error instanceof AuthError`: if true, returns `{ error: "Invalid email or password." }`; otherwise re-throws. The re-throw is required because `signIn`'s `redirectTo` performs a *successful* login by throwing a special `NEXT_REDIRECT` error internally — a catch block that didn't distinguish error types would swallow that too, silently breaking the redirect.
- **`src/app/login/login-form.tsx`** — a small Client Component, and the one deliberate deviation from "everything in the server component." Next.js has no supported way for a plain `<form action={serverAction}>` to hand its return value back to a Server Component for rendering — the only mechanism is React's `useActionState` hook, which requires `"use client"`. This file wraps `loginAction` (kept at exactly the `(formData) => ...` signature specified, unchanged) in a thin adapter for `useActionState`, and renders the `Alert` only when `state.error` is set.
- **`src/components/sign-out-button.tsx`** — a form with an inline server action (`"use server"` on the function itself), calling `signOut({ redirectTo: "/login" })`. No `"use client"` needed — forms bound to server actions work without client JS.

## 5. Role-based access control

- **`src/lib/session.ts`** — three helpers, each building on the last:
  - `getCurrentUser()` — `session?.user ?? null`.
  - `requireUser()` — redirects to `/login` if `getCurrentUser()` is null; otherwise returns the user. Next.js's `redirect()` is typed to return `never`, so TypeScript correctly narrows the return type to non-null without any manual assertion.
  - `requireRole(allowed: Role[])` — calls `requireUser()`, then redirects to `/forbidden` if the user's role isn't in `allowed`.
- **`src/app/(app)/`** — a Next.js route group (the parentheses mean it doesn't appear in the URL). `layout.tsx` calls `requireUser()` (blocks anyone not logged in from the whole group) and renders a nav bar: "Dashboard" always, "Admin" only for `LOCAL_ADMIN`/`SUPER_ADMIN`, "Settings" only for `SUPER_ADMIN`, plus the sign-out button.
- **`dashboard/page.tsx`**, **`admin/page.tsx`**, **`settings/page.tsx`** — each calls its own `requireUser()`/`requireRole()` independently rather than trusting the layout alone. The layout only proves "logged in" — it doesn't prove "allowed on this specific page."
- **`src/app/forbidden/page.tsx`** — plain text and a link back to `/dashboard`. No auth check of its own; the message itself reveals nothing sensitive.
- **`src/app/page.tsx`** — replaced entirely. Now just checks `auth()` and redirects to `/login` or `/dashboard`; a few lines, no leftover starter-template content.

**One import note that came up twice:** `@/generated/prisma` (the bare path, no `/client` suffix) doesn't resolve — there's no `index.ts` at that folder's root. Every file that needs `Role` imports from `@/generated/prisma/client` instead, matching the convention already established in `src/lib/prisma.ts`.

## 6. Verification

Tested against the real seeded database and all 5 test accounts, not just compiled/linted:

- `authorize()` edge cases via direct `fetch` calls to the Auth.js endpoints: correct login succeeds, wrong password fails generically, and a temporarily-deactivated account (toggled via a throwaway script, then restored) fails with the *same* generic error as a wrong password — confirming the two failure reasons are genuinely indistinguishable from outside.
- The login page's `Alert` rendering, confirmed with a real failed and a real successful submission.
- **A browser-automation quirk worth remembering:** simulated clicks and keypresses through the testing tool weren't reliably triggering form submission in this Base UI-based app, which briefly looked like a real bug. Tracing it required reading the dev server's own log file directly (`.next/dev/logs/next-development.log`) to see that no request was even reaching the server. The actual code was fine — confirmed by calling `form.requestSubmit()` directly via JS, which fires a genuine native submit event and worked correctly. Not a defect in the app; just a limitation of simulated clicks against this component library in this tool.
- **The full role matrix**, end to end, for all three roles:

  | Check | EMPLOYEE | LOCAL_ADMIN | SUPER_ADMIN |
  |---|---|---|---|
  | Nav bar shows | Dashboard | Dashboard, Admin | Dashboard, Admin, Settings |
  | `/admin` (direct URL) | → `/forbidden` | renders | renders |
  | `/settings` (direct URL) | → `/forbidden` | → `/forbidden` | renders |

  Plus: unauthenticated `/` and `/dashboard` both redirect to `/login`; signing out and revisiting `/dashboard` redirects to `/login` too.

---

## What's next (Day 4)

Build the employee request form and "my bookings" view — a logged-in employee can submit a meeting room request (title, purpose, date, start/end time, attendee counts by type, required facilities, optional preferred room) and see it listed with status `PENDING`.
