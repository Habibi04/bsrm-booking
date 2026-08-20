# Day 2 — Full Database Schema + Seed Data

**Goal (from PROJECT_SPEC.md section 6):** 3 rooms, 8 facilities, 4 attendee types, 8 refreshment items, 7 rules, and 5 test users exist in the database.

**Status: done.**

---

## 1. The 13-model schema

`prisma/schema.prisma` now has every table from spec section 3: `User`, `Room`, `Facility`, `RoomFacility`, `AttendeeType`, `Booking`, `BookingAttendeeGroup`, `RefreshmentItem`, `RefreshmentRule`, `BookingRefreshment`, `Feedback`, `FeedbackFacilityIssue`, `AuditLog`.

Design decisions the spec didn't spell out directly:

- **IDs:** `String @id @default(cuid())` everywhere, except two join tables the spec lists no `id` column for.
- **Composite primary keys double as unique constraints.** `RoomFacility` (`@@id([roomId, facilityId])`) and `BookingAttendeeGroup` (`@@id([bookingId, attendeeTypeId])`) use their natural key as the primary key — matches the spec's field list exactly, no extra column added, and inherently prevents duplicate rows.
- **Two tables needed a synthetic `id` anyway.** `BookingRefreshment` and `FeedbackFacilityIssue` list no `id` in the spec and have no requested uniqueness — duplicates are plausible there (e.g. the same refreshment item added twice with different notes), so they can't safely use their foreign keys as a composite primary key. Each gets a bare `id String @id @default(cuid())` purely so Prisma can address individual rows.
- **Explicit unique constraints:** `User.email`, `Room.name`, `Facility.name`, `AttendeeType.name`, `RefreshmentItem.name` (all single-column), and `Feedback` on `(bookingId, userId)` — one feedback submission per person per meeting.
- **Indexes:** `Booking` on `(assignedRoomId, startTime, endTime)` and on `status` (both needed constantly once the approval queue and conflict checks exist), `AuditLog.createdAt`, `Feedback.bookingId`.
- **Named relations** disambiguate `Booking`'s two references each to `Room` (`preferredRoomId` / `assignedRoomId`) and `User` (`requesterId` / `reviewedById`).
- **Cascade deletes** only on the four pure child/junction tables whose rows are meaningless without their parent (`RoomFacility`, `BookingAttendeeGroup`, `BookingRefreshment`, `FeedbackFacilityIssue`). Everything else is left at Prisma's default — consistent with the spec's own "deactivate instead of deleting" pattern for `User`, `Room`, `Facility`, `AttendeeType`, `RefreshmentItem`.
- **Timezone handling is documented directly in the schema.** A comment above `RefreshmentRule` states that `appliesFromTime`/`appliesToTime` are Asia/Dhaka wall-clock times (UTC+6) while `Booking.startTime`/`endTime` are UTC — so the future rule engine must convert before comparing — and that the `@db.Time()` columns must always be read with `getUTCHours()`/`getUTCMinutes()`, never the local-time variants, or the hour comes back shifted.

## 2. Migration applied and verified

Ran `npx prisma migrate dev --name init` against Neon (via the unpooled `DIRECT_URL` — see Day 1 for why). Applied as `prisma/migrations/20260813105024_init/migration.sql`.

Verified for real, not just trusted the CLI's success message: wrote a throwaway script using the `pg` driver to run `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'` directly against Neon. All 13 model tables came back, plus `_RequestedFacilities` (Prisma's auto-generated join table for the `Booking`↔`Facility` many-to-many) and `_prisma_migrations` (Prisma's own tracking table) — 15 total, exactly as expected. Deleted the script afterward.

## 3. Seed script

`prisma/seed.ts` seeds in dependency order — facilities, attendee types, and refreshment items before the room-facility links and rules that reference them — using `upsert` throughout so re-running it never creates duplicates.

**Rooms** (placeholder capacity/location/description — to be corrected once real figures are confirmed):
- PADMA — capacity 20, 3rd Floor, Head Office
- MEGHNA — capacity 12, 2nd Floor, Head Office
- JAMUNA — capacity 6, 2nd Floor, Head Office

**8 facilities, 4 attendee types, 8 refreshment items** — straight from spec section 3, refreshment items categorized BEVERAGE/SNACK/MEAL.

**RoomFacility — a deliberately uneven spread**, not identical rooms: PADMA is fully equipped (all 8 facilities `AVAILABLE`), MEGHNA is missing a couple of items it never had (`NOT_AVAILABLE`), and JAMUNA is the sparsest. **JAMUNA's Projector is deliberately marked `OUT_OF_ORDER`** with the note "Bulb needs replacement, reported 12 Aug" — this is intentional seed data, not a bug, so the Day 8 demo has a real example of the room detail page's three-way grouping (available / out of order / not present) and of an admin later marking a facility fixed.

**The 7 named refreshment rules expand to 12 database rows.** The spec's starter table lists 7 rules, but `RefreshmentRule` stores exactly one `refreshmentItemId` per row (by design — see the schema notes above), and 3 of the 7 named rules serve more than one item:
- Morning tea → Tea, Coffee, Biscuits (3 rows)
- Foreign guest hospitality → Bottled Water, Fresh Juice (2 rows)
- All other rules serve one item each (1 row)

Every row for the same named rule shares its time window, trigger mode, minimum duration, attendee type, and priority — only the item differs. Because `RefreshmentRule` has no natural unique business key, each row is upserted by a fixed, readable `id` (e.g. `"morning-tea-tea"`) instead of a `@@unique` constraint, so re-running the seed updates rows instead of duplicating them.

Rule times are built with an explicit UTC string, e.g. `new Date('1970-01-01T09:00:00Z')` — never from a local-time string — so the stored value lands as the intended Dhaka wall-clock hour regardless of what timezone the machine running the seed script is in. The three rules with no real time restriction ("any") use `00:00`–`23:59`.

**Priorities** are set, not left at 0: guest-hospitality rules (Guest water, Foreign guest hospitality) at 20, the four meal/tea-time rules at 10, Long meeting refill at 5. Commented in the script as a starting point — editable through the super admin UI on Day 7.

**5 test users** — 1 SUPER_ADMIN, 2 LOCAL_ADMIN, 2 EMPLOYEE — obviously fake names, `@example.com` addresses, no real BSRM data. All five share one password, hashed with bcryptjs before storage. The plaintext password is **not** hardcoded in the script: it's read from `process.env.SEED_PASSWORD` (set in `.env`), falling back to a known default only if that variable is unset. Credentials are written to `TEST_ACCOUNTS.md` — gitignored, regenerated fresh on every seed run, never committed.

**Confirmed row counts after running `npx prisma db seed`:**

| Table | Count |
|---|---|
| Rooms | 3 |
| Facilities | 8 |
| Room facilities | 24 |
| Attendee types | 4 |
| Refreshment items | 8 |
| Refreshment rules | 12 |
| Users | 5 |

## 4. Prisma 7 detail: where the seed command lives

Unlike Prisma 5/6, where you'd add a `"prisma": { "seed": "..." }` block to `package.json`, Prisma 7 configures the seed command in **`prisma.config.ts`**, under `migrations.seed`:

```ts
migrations: {
  path: "prisma/migrations",
  seed: "tsx prisma/seed.ts",
},
```

Running `npx prisma db seed` reads this and executes the script through `tsx` (installed as a dev dependency alongside `bcryptjs` and `@types/bcryptjs` specifically for this).

---

## What's next (Day 3)

Wire up Auth.js's credentials provider against the `User` table, so each of the 5 seeded test accounts can log in and gets blocked from pages their role shouldn't see.
